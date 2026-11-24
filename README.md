# NeighbourFit — Toronto neighbourhood-matcher lead engine

A free "find your neighbourhood" tool for Toronto home buyers that turns visitors into scored real-estate leads.

**Funnel:** ad / social / SEO → 3-step quiz (priorities, budget, timeline) → top-3 matches on a live map (2 blurred) → email gate → full report + "book a call" CTA → lead lands in Google Sheets, scored HOT / WARM / NURTURE, and hot leads email you instantly.

## Run locally
```bash
npx serve .        # or any static server, then open http://localhost:3000
```

## Go live (GitHub Pages)
Settings → Pages → Deploy from branch → `main` / root. Your site is at `https://<user>.github.io/<repo>/`.

## Connect leads to Google Sheets (5 min)
1. New Google Sheet → Extensions → Apps Script → paste `apps-script/Code.gs`.
2. Deploy → New deployment → Web app → Execute as **Me**, access **Anyone** → copy the `/exec` URL.
3. Put it in `config.js` → `leadEndpoint`. Also set `agentName`, `bookingUrl` (e.g. Calendly).

Without an endpoint, leads are kept in the browser's localStorage (`nf_leads`) for testing.

## Lead scoring
| Signal | Points |
|---|---|
| Moving in 0–3 / 3–6 / 6–12 months | 40 / 25 / 10 |
| Pre-approved | +25 |
| Left phone number | +15 |
| Selling & buying (listing opportunity) | +20 |
| Relocating | +10 |

≥60 = HOT, ≥30 = WARM, else NURTURE. Tweak in `app.js → leadScore()`.

## Data — read before marketing
`data/neighbourhoods.js` ships with **illustrative estimates** (1–10) for 32 neighbourhoods so the app works today. Replace with real figures before making claims:
- Boundaries & profiles: Toronto Open Data "Neighbourhoods" + "Neighbourhood Profiles"
- Safety: Toronto Police Service neighbourhood crime rates
- Schools: EQAO / Fraser Institute results
- Transit: TTC stop locations (GTFS); Parks: Parks & Recreation facilities
- Prices: your MLS / TRREB stats

## Next steps
- Add GA4 / Meta Pixel snippet to `index.html` (the `track()` hook already fires `step_view` and `lead`).
- Auto-send the report to the lead from Apps Script and add a drip sequence (or push into HubSpot).
- Build one SEO landing page per neighbourhood that links into the quiz.
- Ensure CASL compliance: keep the consent checkbox, add your business address + unsubscribe in emails.
