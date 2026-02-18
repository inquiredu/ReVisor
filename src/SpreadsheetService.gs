/**
 * SpreadsheetService.gs
 * Handles persistence and analytics using Google Sheets as a database.
 */

/**
 * Creates or finds the "ReVisor_Databases" folder and a new/existing Spreadsheet.
 * 
 * @param {string} name - The name of the spreadsheet (usually the Unit or Year).
 * @returns {string} The ID of the spreadsheet.
 */
function getOrCreateDatabase(name) {
  var folderName = "ReVisor_Databases";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  
  var files = folder.getFilesByName(name);
  if (files.hasNext()) {
    return files.next().getId();
  } else {
    var ss = SpreadsheetApp.create(name);
    var file = DriveApp.getFileById(ss.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file); // Move from root to the specific folder
    initSheet(ss.getSheets()[0], "General Analysis");
    return ss.getId();
  }
}

/**
 * Initializes a sheet with the standard ReVisor headers.
 */
function initSheet(sheet, name) {
  if (name) sheet.setName(name);
  var headers = [
    "Timestamp", "Doc Name", "Doc ID", "Authors", "Revisions", 
    "Duration (Min)", "Consistency", "Vocab Level", "Flags", 
    "AI Summary", "Inquiry Questions", "Rubric Alignment"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
       .setBackground("#1a73e8").setFontColor("white").setFontWeight("bold");
  sheet.setFrozenRows(1);
}

/**
 * Saves analysis results to a specific tab in the database.
 * 
 * @param {string} ssId - Spreadsheet ID.
 * @param {string} tabName - Name of the unit/assignment tab.
 * @param {Object} report - Analysis report from AnalysisEngine/Gemini.
 */
function saveAnalysisToSheet(ssId, tabName, report) {
  var ss = SpreadsheetApp.openById(ssId);
  var sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
  
  // If it's a new sheet, init headers
  if (sheet.getLastRow() === 0) {
    initSheet(sheet);
  }

  var ai = report.aiInsight || {};
  var row = [
    new Date(),
    report.docName || "Unknown",
    report.docId,
    report.metrics.authors.map(a => a.name).join(", "),
    report.metrics.totalRevisions,
    (report.metrics.durationMs / 60000).toFixed(1),
    ai.voiceConsistency || 0,
    ai.vocabularyLevel || "N/A",
    report.flags.map(f => f.type).join("; "),
    ai.styleNotes || "",
    (report.processQuestions || []).join(" | "),
    ai.rubricAlignment || ""
  ];

  sheet.appendRow(row);
  return { success: true, url: ss.getUrl() };
}

/**
 * Retrieves all previous analyses from a tab.
 */
function getHistoryFromSheet(ssId, tabName) {
  try {
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();
    
    return data.map(function(row) {
      return {
        timestamp: row[0],
        docName: row[1],
        docId: row[2],
        authors: row[3],
        revisions: row[4],
        consistency: row[6],
        vocab: row[7]
      };
    });
  } catch (e) {
    return [];
  }
}
