# NeighbourFit — operations

**Owner:** Jason Pittelli (maintenance and lead follow-up). **Live site:** https://jp-glitch-ai.github.io/neighbourfit/

## What it does
Visitor answers a 3-step quiz → sees top-3 neighbourhood matches → gives name + email (+ optional phone, consent required) → gets a full report → can ask for a call.

| Event | Where it goes |
|---|---|
| Report unlocked | New row in Google Sheet **NeighbourFit Leads → Leads**; tier HOT/WARM/NURTURE; Google Ads conversion (value 50/20/5) |
| HOT or WARM lead | Instant email to Jason's Gmail ("🔥 HOT lead: …") |
| Call requested | Extra HOT row (stage "CALL REQUESTED (time)") + email; Ads conversion value 100 |

**Limits:** it never emails or calls leads itself; follow-up is Jason's. No payment or password data is collected.

## Daily use
1. Watch Gmail for 🔥 emails — call HOT leads within 5 minutes.
2. In the Sheet, update the **status** column (New → Contacted → Appointment → Client / Not a fit).

## Pause / restart / override
| To… | Do this |
|---|---|
| Pause lead capture (site stays up) | In `config.js` set `leadEndpoint: ""` and push. Leads then stay only in the visitor's browser. |
| Pause the receiver instantly | script.google.com → project → Deploy → Manage deployments → Archive. (Site still shows reports; leads are not saved.) |
| Take the site offline | GitHub repo → Settings → Pages → Unpublish. |
| Stop Ads tracking | In `config.js` set `googleAdsId: ""` and push. |
| Stop hot-lead emails | In the Apps Script, set `NOTIFY_TIERS = []`, then Deploy → Manage deployments → Edit → New version. |
| Restart | Undo the change above (push / redeploy). |
| Roll back the site | `git revert <commit>` and push; Pages rebuilds in ~1 min. |
| Roll back the receiver | Manage deployments → Edit → Version → pick the previous version → Deploy (same URL). |

## Troubleshooting
| Symptom | Check |
|---|---|
| No new rows | Apps Script → Executions: errors are logged there ("doPost failed" / "Rejected lead"). Confirm `leadEndpoint` in config.js matches the deployment URL. |
| Rows but no email | Apps Script → Executions for MailApp errors; daily mail quota (run `setup()` to see it). Only HOT/WARM email. |
| Duplicate rows | Same email + same timestamp is blocked server-side; different timestamps are separate leads (e.g. a call request). |
| Odd text in a cell starting with ' | Intentional: values starting with = + - @ are stored as text so they can't run as formulas. |
| Site shows old version | Hard refresh; asset links are versioned (`?v=N` in index.html) — bump N when changing JS/CSS. |
| Ads shows no conversions | Conversions take up to 24 h to appear. Check the tag loads: open the site, DevTools → Network → `gtag/js?id=AW-18288361761`. |

## Safeguards (tested 2026-11-26)
Server rejects malformed/empty/bad-email/bad-tier posts and spam-trap hits; neutralises formula injection; caps fields at 300 chars; blocks exact resends; logs errors. Page blocks empty name, bad email, missing consent and double submits; renders names as text (no HTML injection); still shows the report if the receiver is down (lead kept in the browser).

## Compliance notes
- **CASL:** consent checkbox is required; any marketing email to leads must include unsubscribe + business address.
- **PIPEDA:** privacy notice on the form; delete a lead's row on request.
- **RECO/TRESA:** name + "Bosley Real Estate Ltd., Brokerage" shown on the site; keep the brokerage in every ad.
- **Do Not Call:** a lead who asked for a call has given express consent for that call; check the National DNCL before other cold calls.

## Monitoring (first 2 weeks after go-live)
Daily: Gmail alerts, Sheet rows vs Ads conversions (should roughly match), Apps Script Executions for errors.
