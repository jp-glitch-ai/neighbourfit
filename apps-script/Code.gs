/**
 * NeighbourFit lead receiver (Google Apps Script web app).
 * Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
 * Copy the /exec URL into config.js -> leadEndpoint.
 * To update code without changing the URL: Deploy > Manage deployments > Edit > Version: New version.
 * See OPERATIONS.md for pause/restart/troubleshooting.
 */
const NOTIFY_EMAIL = Session.getEffectiveUser().getEmail(); // the script owner; or hard-code an address
const NOTIFY_TIERS = ["HOT", "WARM"];                     // which leads trigger an instant email
const TIERS = ["HOT", "WARM", "NURTURE"];
const MAX_LEN = 300;                                       // per-field cap
const DEDUPE_ROWS = 500;                                   // how many recent rows to check for repeats

const COLUMNS = ["createdAt", "tier", "score", "name", "email", "phone", "stage", "timeline",
  "preapproved", "budget", "topMatches", "priorities", "source", "campaign", "status"];

// Set to your Sheet's ID (from its URL) when using a standalone script; leave "" if the script is bound to the Sheet.
const SHEET_ID = "";

function doPost(e) {
  try {
    const lead = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // Spam trap: real visitors never see or fill the hidden "website" field.
    if (lead.website) return reply_({ ok: true, ignored: "honeypot" });

    const err = validate_(lead);
    if (err) { console.warn("Rejected lead: " + err); return reply_({ ok: false, error: err }); }

    lead.status = "New";
    const row = COLUMNS.map((c) => clean_(lead[c]));

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet_();
      if (isDuplicate_(sheet, row)) return reply_({ ok: true, duplicate: true });
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }

    if (NOTIFY_TIERS.includes(lead.tier) && NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: `🔥 ${lead.tier} lead: ${plain_(lead.name)} — ${plain_(lead.timeline)} mo, ${plain_(lead.budget)}`,
        body:
          `${plain_(lead.name)} (${plain_(lead.email)}${lead.phone ? ", " + plain_(lead.phone) : ""})\n` +
          `Stage: ${plain_(lead.stage)} | Pre-approved: ${lead.preapproved === true}\n` +
          `Top matches: ${plain_(lead.topMatches)}\nSource: ${plain_(lead.source)} ${plain_(lead.campaign)}\n\n` +
          `Call within 5 minutes — speed to lead wins.`
      });
    }
    return reply_({ ok: true });
  } catch (err) {
    console.error("doPost failed: " + (err && err.stack || err)); // visible under Executions in the Apps Script editor
    return reply_({ ok: false, error: "server" });
  }
}

function validate_(lead) {
  if (typeof lead !== "object" || lead === null || Array.isArray(lead)) return "not an object";
  if (!lead.name || String(lead.name).trim().length < 1) return "missing name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(lead.email || ""))) return "bad email";
  if (!TIERS.includes(lead.tier)) return "bad tier";
  return "";
}

// Neutralise spreadsheet formulas (=, +, -, @) and cap length.
function clean_(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "boolean" || typeof v === "number") return v;
  let s = String(v).replace(/[\r\n\t]+/g, " ").slice(0, MAX_LEN);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function plain_(v) { return String(v === undefined || v === null ? "" : v).replace(/[\r\n]+/g, " ").slice(0, MAX_LEN); }

// Same email + same createdAt already in the recent rows = a resend, not a new lead.
function isDuplicate_(sheet, row) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const start = Math.max(2, last - DEDUPE_ROWS + 1);
  const recent = sheet.getRange(start, 1, last - start + 1, 5).getDisplayValues(); // createdAt..email
  const key = String(row[0]) + "|" + String(row[4]).toLowerCase();
  return recent.some((r) => (r[0] + "|" + String(r[4]).toLowerCase()) === key);
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run once from the editor: creates the Leads tab and asks for permissions.
function setup() {
  getSheet_();
  Logger.log("Ready. Hot-lead emails go to " + NOTIFY_EMAIL + " (quota left: " + MailApp.getRemainingDailyQuota() + ")");
}

function getSheet_() {
  const ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("Leads");
  if (!sh) {
    sh = ss.insertSheet("Leads");
    sh.appendRow(COLUMNS);
    sh.setFrozenRows(1);
  }
  return sh;
}
