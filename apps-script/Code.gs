/**
 * NeighbourFit lead receiver — paste into Extensions > Apps Script on a Google Sheet.
 * Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
 * Copy the /exec URL into config.js -> leadEndpoint.
 */
const NOTIFY_EMAIL = Session.getActiveUser().getEmail(); // or hard-code your address
const NOTIFY_TIERS = ["HOT", "WARM"];                     // which leads trigger an instant email

const COLUMNS = ["createdAt", "tier", "score", "name", "email", "phone", "stage", "timeline",
  "preapproved", "budget", "topMatches", "priorities", "source", "campaign", "status"];

function doPost(e) {
  const lead = JSON.parse(e.postData.contents);
  lead.status = "New";
  const sheet = getSheet_();
  sheet.appendRow(COLUMNS.map((c) => lead[c] ?? ""));

  if (NOTIFY_TIERS.includes(lead.tier) && NOTIFY_EMAIL) {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: `🔥 ${lead.tier} lead: ${lead.name} — ${lead.timeline} mo, ${lead.budget}`,
      body:
        `${lead.name} (${lead.email}${lead.phone ? ", " + lead.phone : ""})\n` +
        `Stage: ${lead.stage} | Pre-approved: ${lead.preapproved}\n` +
        `Top matches: ${lead.topMatches}\nSource: ${lead.source} ${lead.campaign}\n\n` +
        `Call within 5 minutes — speed to lead wins.`
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("Leads");
  if (!sh) {
    sh = ss.insertSheet("Leads");
    sh.appendRow(COLUMNS);
    sh.setFrozenRows(1);
  }
  return sh;
}
