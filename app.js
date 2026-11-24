(() => {
  const C = window.CONFIG, HOODS = window.NEIGHBOURHOODS, FACTORS = window.FACTORS;
  const $ = (s) => document.querySelector(s);
  const steps = [...document.querySelectorAll(".step")];
  const weights = Object.fromEntries(FACTORS.map((f) => [f.key, 3]));
  const LEVELS = ["Don't care", "A little", "Somewhat", "Important", "Very", "Must have"];
  let ranked = [];
  // City median of the crime index, so a card can say "below/above city".
  const CITY_CRIME = (() => {
    const v = HOODS.map((h) => h.facts && h.facts.crimePer100k).filter((x) => x != null).sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : Infinity;
  })();

  document.title = `${C.brand} — find your Toronto neighbourhood`;
  $("#n-count").textContent = HOODS.length;

  // ---------- Map ----------
  const map = L.map("map", { zoomControl: false, attributionControl: true }).setView([43.70, -79.40], 11);
  // OSM tiles, darkened via CSS (.leaflet-tile-pane). Swap for a Mapbox/Stadia key at scale.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 18
  }).addTo(map);
  const markers = HOODS.map((h) =>
    L.circleMarker([h.lat, h.lng], { radius: 6, color: "#5eead4", weight: 1, fillOpacity: 0.35 })
      .bindTooltip(h.name).addTo(map)
  );

  // ---------- Steps ----------
  let current = 0;
  const show = (i) => {
    steps.forEach((s, j) => s.classList.toggle("active", j === i));
    current = i;
    $("#panel").scrollTop = 0;
    track("step_view", { step: steps[i].dataset.step });
  };
  document.querySelectorAll("[data-next]").forEach((b) =>
    b.addEventListener("click", () => {
      if (steps[current].dataset.step === "situation") computeMatches();
      show(current + 1);
    })
  );
  $("#restart").addEventListener("click", () => { resetMap(); show(0); });

  // ---------- Sliders ----------
  $("#sliders").innerHTML = FACTORS.map((f) => `
    <div class="slider">
      <div class="row"><span>${f.label}</span><span id="lv-${f.key}">${LEVELS[3]}</span></div>
      <input type="range" min="0" max="5" value="3" data-key="${f.key}" aria-label="${f.label}" />
    </div>`).join("");
  $("#sliders").addEventListener("input", (e) => {
    const k = e.target.dataset.key; if (!k) return;
    weights[k] = +e.target.value;
    $(`#lv-${k}`).textContent = LEVELS[weights[k]];
  });

  // ---------- Matching ----------
  function score(h, budget) {
    let num = 0, den = 0;
    for (const f of FACTORS) { num += weights[f.key] * h[f.key]; den += weights[f.key] * 10; }
    let s = den ? num / den : 0.5;
    if (h.price && h.price > budget) s *= Math.max(0.5, 1 - (h.price - budget) / budget); // over-budget penalty
    return Math.round(s * 100);
  }
  function computeMatches() {
    const budget = +$("#budget").value;
    ranked = HOODS.map((h, i) => ({ ...h, i, match: score(h, budget) })).sort((a, b) => b.match - a.match);
    $("#teaser").innerHTML = ranked.slice(0, 3).map((h, n) =>
      `<li class="${n === 0 ? "" : "locked"}"><span class="nm">${h.name}</span><span class="pct">${h.match}%</span></li>`).join("");
    highlight(ranked.slice(0, 3));
  }
  function highlight(top) {
    markers.forEach((m) => m.setStyle({ radius: 5, fillOpacity: 0.2, color: "#3b4b66" }));
    top.forEach((h) => markers[h.i].setStyle({ radius: 11, fillOpacity: 0.7, color: "#5eead4" }).bringToFront());
    map.flyToBounds(L.latLngBounds(top.map((h) => [h.lat, h.lng])).pad(0.6), { duration: 1.2 });
  }
  function resetMap() {
    markers.forEach((m) => m.setStyle({ radius: 6, fillOpacity: 0.35, color: "#5eead4" }));
    map.flyTo([43.70, -79.40], 11);
  }

  // ---------- Lead scoring ----------
  function leadScore(d) {
    let s = { "0-3": 40, "3-6": 25, "6-12": 10, "12+": 0 }[d.timeline] || 0;
    if (d.preapproved) s += 25;
    if (d.phone) s += 15;
    if (d.stage === "upsize") s += 20;       // also a listing opportunity
    else if (d.stage === "relocate") s += 10;
    const tier = s >= 60 ? "HOT" : s >= 30 ? "WARM" : "NURTURE";
    return { score: s, tier };
  }

  // ---------- Lead capture ----------
  $("#lead-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const lead = {
      createdAt: new Date().toISOString(),
      name: $("#name").value.trim(),
      email: $("#email").value.trim(),
      phone: $("#phone").value.trim(),
      budget: $("#budget").selectedOptions[0].text,
      timeline: $("#timeline").value,
      stage: $("#stage").value,
      preapproved: $("#preapproved").checked,
      priorities: FACTORS.map((f) => `${f.key}:${weights[f.key]}`).join(" "),
      topMatches: ranked.slice(0, 3).map((h) => `${h.name} (${h.match}%)`).join(", "),
      source: new URLSearchParams(location.search).get("utm_source") || document.referrer || "direct",
      campaign: new URLSearchParams(location.search).get("utm_campaign") || ""
    };
    Object.assign(lead, leadScore(lead));

    await sendLead(lead);
    track("lead", { tier: lead.tier });
    renderReport(lead);
    show(4);
  });

  async function sendLead(lead) {
    const saved = JSON.parse(localStorage.getItem("nf_leads") || "[]");
    saved.push(lead); localStorage.setItem("nf_leads", JSON.stringify(saved));
    if (!C.leadEndpoint) {
      console.info("[NeighbourFit] No leadEndpoint set in config.js — lead kept in localStorage only:", lead);
      return;
    }
    try {
      // text/plain avoids a CORS preflight, which Apps Script can't answer.
      await fetch(C.leadEndpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(lead) });
    } catch (err) { console.warn("Lead send failed", err); }
  }

  // ---------- Report ----------
  function renderReport(lead) {
    $("#report-title").textContent = `${lead.name}, here's where you fit`;
    const bars = (h) => FACTORS.map((f) =>
      `<div class="bar" title="${f.source || ""}">${f.label}<i><b style="width:${h[f.key] * 10}%"></b></i></div>`).join("");
    const money = (k) => k >= 1000 ? `$${(k / 1000).toFixed(2)}M` : `$${k}K`;
    const facts = (h) => {
      const x = h.facts || {}, out = [];
      if (x.eqao != null) out.push(`EQAO avg ${x.eqao}% (${x.schoolsNearby} schools)`);
      if (x.crimePer100k != null) out.push(`${x.crimePer100k < CITY_CRIME ? "Below" : "Above"} city crime index`);
      if (x.greenPct != null) out.push(`${x.greenPct}% green space`);
      if (x.subway) out.push("Subway within 800 m");
      if (x.kidsPct != null) out.push(`${x.kidsPct}% kids under 15`);
      return out.map((t) => `<span>${t}</span>`).join("");
    };
    $("#report").innerHTML = ranked.slice(0, 5).map((h) => `
      <div class="card" data-i="${h.i}">
        <h3><span>${h.name}</span><span class="pct">${h.match}%</span></h3>
        ${h.price ? `<div class="small">Median home value ≈ ${money(h.price)} <span class="muted">(2021 Census)</span></div>` : ""}
        <div class="facts">${facts(h)}</div>
        <div class="bars">${bars(h)}</div>
      </div>`).join("") +
      `<p class="more">Also worth a look: ${ranked.slice(5, 10).map((h) => `${h.name} (${h.match}%)`).join(", ")}</p>`;
    document.querySelectorAll(".card").forEach((c) => c.addEventListener("click", () => {
      const h = HOODS[+c.dataset.i]; map.flyTo([h.lat, h.lng], 14); markers[+c.dataset.i].openTooltip();
    }));
    const cta = $("#cta");
    cta.innerHTML = `<p><strong></strong></p><p class="small"></p>`;
    cta.querySelector("strong").textContent = `Want to see homes in ${ranked[0].name}?`;
    const who = C.agentName ? `${C.agentName}, ${C.agentTitle},` : "A local Toronto expert";
    cta.querySelector(".small").textContent = `${who} can call you with current listings and what they're really selling for.`;
    if (C.bookingUrl) {
      const a = document.createElement("a");
      a.className = "btn primary"; a.href = C.bookingUrl; a.target = "_blank"; a.rel = "noopener";
      a.textContent = "Book a free 15-min call";
      cta.appendChild(a);
    } else {
      cta.appendChild(callbackForm(lead));
    }
    highlight(ranked.slice(0, 5));
  }

  // "Have someone call me" — sent as its own HOT row so it triggers an instant email.
  function callbackForm(lead) {
    const f = document.createElement("form");
    f.className = "callback";
    f.innerHTML = `
      <input name="phone" type="tel" placeholder="Best phone number" required autocomplete="tel" />
      <select name="when" aria-label="Best time to call">
        <option>Anytime</option><option>Mornings</option><option>Afternoons</option><option>Evenings</option><option>Weekends</option>
      </select>
      <button class="btn primary" type="submit">Have someone call me</button>`;
    f.phone.value = lead.phone || "";
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = f.querySelector("button");
      btn.disabled = true; btn.textContent = "Sending…";
      await sendLead({
        ...lead,
        createdAt: new Date().toISOString(),
        phone: f.phone.value.trim(),
        stage: `CALL REQUESTED (${f.when.value}) — ${lead.stage}`,
        tier: "HOT",
        score: 100
      });
      track("callback_request", {});
      f.innerHTML = `<p class="done">✓ Got it — expect a call ${f.when.value === "Anytime" ? "soon" : "in the " + f.when.value.toLowerCase().replace("weekends", "weekend")}.</p>`;
    });
    return f;
  }

  // Hook for analytics (GA4 / Meta pixel). No-op unless gtag/fbq is on the page.
  function track(event, params) {
    if (window.gtag) window.gtag("event", event, params);
    if (window.fbq && event === "lead") window.fbq("track", "Lead");
  }
})();
