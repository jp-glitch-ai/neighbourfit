"""Build data/neighbourhoods.js from open data.

Scores all 158 official City of Toronto neighbourhoods on the app's 8 factors,
using only openly licensed sources (see SOURCES below and data/SOURCES.md).

Usage:
    pip install -r scripts/requirements.txt
    python scripts/build_data.py --raw <download-folder>

Downloads are cached in --raw, so re-runs are fast. Delete a file there to
fetch a fresh copy (e.g. when Toronto Police publish a new year of crime rates).
"""
import argparse
import csv
import io
import json
import math
import os
import statistics
import zipfile
from collections import Counter, defaultdict
from datetime import date

import openpyxl
import requests
from shapely.geometry import Point, shape
from shapely.ops import transform
from shapely.strtree import STRtree

TO = "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset"
SOURCES = {
    "hoods.geojson": f"{TO}/fc443770-ef0a-4025-9c2c-2cb558bfab00/resource/0719053b-28b7-48ea-b863-068823a93aaa/download/Neighbourhoods%20-%204326.geojson",
    "profiles.xlsx": f"{TO}/6e19a90f-971c-46b3-852c-0c48c436d1fc/resource/19d4a806-7385-4889-acf2-256f1e079060/download/nbhd_2021_census_profile_full_158model.xlsx",
    "green.geojson": f"{TO}/9a284a84-b9ff-484b-9e30-82f22c1780b9/resource/7a26629c-b642-4093-b33c-a5a21e4f3d22/download/Green%20Spaces%20-%204326.geojson",
    "ttc.zip": f"{TO}/7795b45e-e65a-4465-81fc-c36b9dfff169/resource/cfb6b2b8-6191-41e3-bda1-b175c51148cb/download/TTC%20Routes%20and%20Schedules%20Data.zip",
    "crime.json": "https://services.arcgis.com/S9th0jAJ7bqgIRjw/arcgis/rest/services/Neighbourhood_Crime_Rates_Open_Data/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&f=json",
    "sif.xlsx": "https://data.ontario.ca/dataset/d85f68c5-fcb0-4b4d-aec5-3047db47dcd5/resource/f75540ed-59eb-49ab-ac43-976d563b3a65/download/new_sif_data_2024_25_final_en_oct_2026.xlsx",
}
BBOX = (43.58, -79.64, 43.86, -79.11)
OVERPASS_Q = (
    "[out:json][timeout:180];("
    'nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|nightclub|biergarten)$"]({b});'
    'nwr["shop"~"^(supermarket|convenience|greengrocer|bakery|butcher|deli|pharmacy|chemist|hardware|books|clothes)$"]({b});'
    ");out center tags;"
).format(b=",".join(map(str, BBOX)))
NIGHTLIFE = {"restaurant", "bar", "pub", "nightclub", "biergarten"}

# Local metres (equirectangular around Toronto): accurate enough for areas and buffers.
LAT0, LON0 = 43.7, -79.4
KX, KY = 111_320 * math.cos(math.radians(LAT0)), 110_574
to_m = lambda x, y, z=None: ((x - LON0) * KX, (y - LAT0) * KY)


def fetch(raw, name):
    path = os.path.join(raw, name)
    if not os.path.exists(path):
        print("downloading", name)
        if name == "osm.json":
            r = requests.post("https://overpass-api.de/api/interpreter", data={"data": OVERPASS_Q},
                              headers={"User-Agent": "neighbourfit-data-build"}, timeout=300)
        else:
            r = requests.get(SOURCES[name], timeout=300)
        r.raise_for_status()
        with open(path, "wb") as f:
            f.write(r.content)
    return path


def pct_rank(values, higher_is_better=True):
    """Map raw values to 1-10 by percentile rank (ties share a rank). None -> city median 5.5."""
    known = sorted(v for v in values if v is not None)
    n = len(known)
    out = []
    for v in values:
        if v is None or n < 2:
            out.append(5.5)
            continue
        below = sum(1 for k in known if k < v)
        equal = sum(1 for k in known if k == v)
        p = (below + (equal - 1) / 2) / (n - 1)
        if not higher_is_better:
            p = 1 - p
        out.append(round(1 + 9 * p, 1))
    return out


def parse_pct(s):
    if isinstance(s, (int, float)):
        return float(s)
    s = (s or "").strip().rstrip("%")
    try:
        return float(s)
    except ValueError:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True, help="folder for downloaded source files")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data", "neighbourhoods.js"))
    a = ap.parse_args()
    os.makedirs(a.raw, exist_ok=True)

    # --- Neighbourhood boundaries (158) ---
    gj = json.load(open(fetch(a.raw, "hoods.geojson"), encoding="utf-8"))
    hoods = []
    for f in gj["features"]:
        p = f["properties"]
        g = shape(f["geometry"])
        gm = transform(to_m, g)
        rp = g.representative_point()
        hoods.append({
            "id": int(p["AREA_SHORT_CODE"]), "name": p["AREA_NAME"].strip(),
            "geom": g, "gm": gm, "km2": gm.area / 1e6, "lat": round(rp.y, 4), "lng": round(rp.x, 4),
        })
    hoods.sort(key=lambda h: h["id"])
    by_id = {h["id"]: h for h in hoods}
    print(len(hoods), "neighbourhoods")

    def hood_of(lon, lat):
        pt = Point(lon, lat)
        for h in hoods:
            if h["geom"].contains(pt):
                return h
        return None

    # --- 2021 Census profiles (population, kids, home values) ---
    ws = openpyxl.load_workbook(fetch(a.raw, "profiles.xlsx"), read_only=True).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    ids = rows[1][1:]
    def row(label, start=0):
        for r in rows[start:]:
            if str(r[0]).strip() == label:
                return dict(zip(ids, r[1:]))
        raise KeyError(label)
    pop = row("Total - Age groups of the population - 25% sample data")
    kids = row("0 to 14 years")
    home_val = row("Median value of dwellings ($)")
    for h in hoods:
        h["pop"] = pop[h["id"]]
        h["kids_share"] = kids[h["id"]] / pop[h["id"]] if pop[h["id"]] else None
        h["home_value"] = home_val[h["id"]] or None

    # --- Toronto Police crime rates (per 100k residents) ---
    crime = json.load(open(fetch(a.raw, "crime.json"), encoding="utf-8"))["features"]
    year = max(int(k.rsplit("_", 1)[1]) for k in crime[0]["attributes"] if k.startswith("ASSAULT_RATE_"))
    weights = {"ASSAULT": 1.0, "ROBBERY": 1.5, "SHOOTING": 3.0, "HOMICIDE": 5.0,
               "BREAKENTER": 1.0, "AUTOTHEFT": 0.5, "THEFTOVER": 0.3}
    for c in crime:
        at = c["attributes"]
        h = by_id.get(int(at["HOOD_ID"]))
        if not h:
            continue
        vals = []
        for k, w in weights.items():
            # average the last 3 years to smooth out one-off spikes
            yrs = [at.get(f"{k}_RATE_{y}") for y in (year, year - 1, year - 2)]
            yrs = [v for v in yrs if v is not None]
            vals.append(w * (sum(yrs) / len(yrs) if yrs else 0))
        h["crime_index"] = sum(vals)
    print("crime year", year)

    # --- Ontario school EQAO results (Grade 3/6 reading, writing, math; Gr 9 math; OSSLT) ---
    ws = openpyxl.load_workbook(fetch(a.raw, "sif.xlsx"), read_only=True).worksheets[0]
    it = ws.iter_rows(values_only=True)
    hdr = next(it)
    col = {name: i for i, name in enumerate(hdr)}
    score_cols = [i for name, i in col.items() if name.startswith("Percentage of Grade") or "OSSLT" in name and name.startswith("Percentage")]
    schools = []
    for r in it:
        lat, lon = r[col["Latitude"]], r[col["Longitude"]]
        if not lat or not lon or not (BBOX[0] <= lat <= BBOX[2] and BBOX[1] <= lon <= BBOX[3]):
            continue
        s = [parse_pct(r[i]) for i in score_cols]
        s = [v for v in s if v is not None]
        if s:
            schools.append((Point(*to_m(lon, lat)), statistics.mean(s)))
    tree = STRtree([p for p, _ in schools])
    for h in hoods:
        zone = h["gm"].buffer(1000)  # schools in or within 1 km of the neighbourhood
        near = [schools[i][1] for i in tree.query(zone) if zone.contains(schools[i][0])]
        h["school_avg"] = statistics.mean(near) if near else None
        h["school_n"] = len(near)
    print(len(schools), "schools with EQAO results")

    # --- Green space share of land ---
    green = json.load(open(fetch(a.raw, "green.geojson"), encoding="utf-8"))["features"]
    gpolys = []
    for f in green:
        try:
            g = transform(to_m, shape(f["geometry"]))
            if not g.is_valid:
                g = g.buffer(0)
            gpolys.append(g)
        except Exception:
            pass
    gtree = STRtree(gpolys)
    for h in hoods:
        area = sum(h["gm"].intersection(gpolys[i]).area for i in gtree.query(h["gm"]))
        h["green_share"] = min(1.0, area / h["gm"].area)

    # --- TTC: scheduled stop visits per km² (+ rapid-transit station nearby) ---
    z = zipfile.ZipFile(fetch(a.raw, "ttc.zip"))
    rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(n), encoding="utf-8-sig"))
    rapid_routes = {r["route_id"] for r in rd("routes.txt") if r["route_type"] == "1"}
    rapid_trips = {t["trip_id"] for t in rd("trips.txt") if t["route_id"] in rapid_routes}
    visits, rapid_stops = Counter(), set()
    for st in rd("stop_times.txt"):
        visits[st["stop_id"]] += 1
        if st["trip_id"] in rapid_trips:
            rapid_stops.add(st["stop_id"])
    stops = {s["stop_id"]: (float(s["stop_lon"]), float(s["stop_lat"])) for s in rd("stops.txt")}
    stop_pts = [(Point(*to_m(*xy)), visits[sid], sid in rapid_stops) for sid, xy in stops.items()]
    stree = STRtree([p for p, _, _ in stop_pts])
    for h in hoods:
        zone = h["gm"].buffer(250)
        idx = [i for i in stree.query(zone) if zone.contains(stop_pts[i][0])]
        h["transit_density"] = sum(stop_pts[i][1] for i in idx) / h["km2"]
        z800 = h["gm"].buffer(800)
        h["rapid"] = any(stop_pts[i][2] and z800.contains(stop_pts[i][0]) for i in stree.query(z800))

    # --- OpenStreetMap: everyday shops/cafes (walkability) and restaurants/bars (nightlife) ---
    osm = json.load(open(fetch(a.raw, "osm.json"), encoding="utf-8"))["elements"]
    walk_n, night_n = defaultdict(int), defaultdict(int)
    for e in osm:
        lat = e.get("lat") or e.get("center", {}).get("lat")
        lon = e.get("lon") or e.get("center", {}).get("lon")
        if lat is None:
            continue
        h = hood_of(lon, lat)
        if not h:
            continue
        walk_n[h["id"]] += 1
        if e.get("tags", {}).get("amenity") in NIGHTLIFE:
            night_n[h["id"]] += 1
    for h in hoods:
        h["amenity_density"] = walk_n[h["id"]] / h["km2"]
        h["night_density"] = night_n[h["id"]] / h["km2"]
        h["pop_density"] = h["pop"] / h["km2"]

    # --- Scores (1-10, percentile rank across the city) ---
    col_ = lambda k: [h.get(k) for h in hoods]
    schools_s = pct_rank(col_("school_avg"))
    safety_s = pct_rank(col_("crime_index"), higher_is_better=False)
    tr = pct_rank(col_("transit_density"))
    transit_s = [round(min(10, t * 0.75 + (2.5 if h["rapid"] else 0)), 1) for t, h in zip(tr, hoods)]
    parks_s = pct_rank(col_("green_share"))
    walk_s = pct_rank(col_("amenity_density"))
    night_s = pct_rank(col_("night_density"))
    dens = pct_rank(col_("pop_density"))
    quiet_s = [round(11 - (d + n) / 2, 1) for d, n in zip(dens, night_s)]
    kids_s = pct_rank(col_("kids_share"))
    family_s = [round(0.45 * k + 0.2 * sa + 0.2 * sc + 0.15 * p, 1)
                for k, sa, sc, p in zip(kids_s, safety_s, schools_s, parks_s)]

    out = []
    for i, h in enumerate(hoods):
        out.append({
            "id": h["id"], "name": h["name"], "lat": h["lat"], "lng": h["lng"],
            "price": round(h["home_value"] / 1000) if h["home_value"] else None,
            "schools": schools_s[i], "safety": safety_s[i], "transit": transit_s[i], "parks": parks_s[i],
            "walk": walk_s[i], "nightlife": night_s[i], "quiet": quiet_s[i], "family": family_s[i],
            "facts": {
                "population": h["pop"],
                "eqao": round(h["school_avg"]) if h["school_avg"] else None,
                "schoolsNearby": h["school_n"],
                "crimePer100k": round(h.get("crime_index", 0)),
                "greenPct": round(h["green_share"] * 100),
                "subway": h["rapid"],
                "kidsPct": round(h["kids_share"] * 100) if h["kids_share"] else None,
            },
        })

    with open(a.out, "w", encoding="utf-8", newline="\n") as f:
        f.write(f"""// GENERATED by scripts/build_data.py on {date.today().isoformat()}. Do not edit by hand; re-run the script.
// All 158 official City of Toronto neighbourhoods, scored 1-10 against each other (percentile rank).
// Sources and licences: data/SOURCES.md
// price = 2021 Census median owner-estimated home value, in $K (to be replaced by live IDX listing prices).
window.DATA_META = {json.dumps({"built": date.today().isoformat(), "crimeYears": f"{year-2}-{year}", "census": 2021, "eqao": "2024-25"})};
window.NEIGHBOURHOODS = [
""")
        f.write(",\n".join("  " + json.dumps(o, ensure_ascii=False) for o in out))
        f.write("""
];

window.FACTORS = [
  { key: "schools", label: "School quality", source: "EQAO results, schools within 1 km" },
  { key: "safety", label: "Safety", source: "Toronto Police crime rates, 3-yr average" },
  { key: "transit", label: "Transit access", source: "TTC scheduled service + subway within 800 m" },
  { key: "parks", label: "Parks & green space", source: "Share of land that is green space" },
  { key: "walk", label: "Walkability", source: "Shops, cafés and groceries per km² (OpenStreetMap)" },
  { key: "nightlife", label: "Restaurants & nightlife", source: "Restaurants and bars per km² (OpenStreetMap)" },
  { key: "quiet", label: "Peace & quiet", source: "Low population density and nightlife" },
  { key: "family", label: "Family-friendly", source: "Share of kids under 15, safety, schools, parks" }
];
""")
    print("wrote", os.path.abspath(a.out))


if __name__ == "__main__":
    main()
