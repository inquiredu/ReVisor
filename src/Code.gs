/**
 * Code.gs
 * Main entry point for the ReVisor Web App.
 */

/**
 * ADMIN UTILITY: Run this function ONCE from the Script Editor to save your API Key.
 * After running, you can delete this function or leave it (the key is saved in the properties store).
 */
function SETUP_API_KEY() {
  // Your key is now saved in Script Properties. 
  // If you need to update it, replace 'YOUR_KEY_HERE' temporarily, run this, then revert again.
  var key = 'YOUR_KEY_HERE'; 
  
  if (key === 'YOUR_KEY_HERE' || !key) {
    Logger.log('Current state: Placeholder active. (This is good for security!)');
    return;
  }
  
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  Logger.log('SUCCESS: Gemini API Key has been updated in Script Properties.');
}

/**
 * Serves the web app UI.
 */
function doGet(e) {
  try {
    return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle('ReVisor')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    return HtmlService.createHtmlOutput('<h2>App Error</h2><p>' + error.toString() + '</p>')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * Includes HTML content from another file.
 * Used for separating CSS and JS.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * API: Fetches revisions for a given Doc ID.
 * Exposed to client-side JS.
 */
function apiGetRevisions(docId) {
  return getRevisionHistory(docId);
}

/**
 * API: Lists all Docs in a folder.
 */
function apiListFolderDocs(folderId) {
  // Extract ID if URL
  var match = folderId.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) folderId = match[1];
  
  return listDocumentsInFolder(folderId);
}

/**
 * API: Fetches content for a specific revision.
 */
function apiGetRevisionContent(docId, revId) {
  return getRevisionContent(docId, revId);
}

/**
 * API: Fetches content for multiple revisions in a batch.
 */
function apiFetchRevisionContentBatch(urls) {
  return fetchRevisionContentBatch(urls);
}

/**
 * API: Connects to or creates a "ReVisor Unit Database" Spreadsheet.
 */
function apiConnectDatabase(unitName) {
  if (!unitName) unitName = "ReVisor_Main_Database";
  var ssId = getOrCreateDatabase(unitName);
  var ss = SpreadsheetApp.openById(ssId);
  PropertiesService.getScriptProperties().setProperty('ACTIVE_DB_ID', ssId);
  
  return { 
    id: ssId, 
    url: ss.getUrl(), 
    name: ss.getName(),
    tabs: ss.getSheets().map(s => s.getName())
  };
}

/**
 * API: Saves the analysis to the active database.
 */
function apiSaveAnalysis(report, tabName) {
  var ssId = PropertiesService.getScriptProperties().getProperty('ACTIVE_DB_ID');
  if (!ssId) throw new Error("No database connected. Connect a database first.");
  if (!tabName) tabName = "General Analysis";
  
  return saveAnalysisToSheet(ssId, tabName, report);
}

/**
 * API: Analyzes a document.
 */
function apiAnalyzeDocument(docId, rubric) {
  var revisions = getRevisionHistory(docId);
  var report = analyzeRevisionPatterns(revisions, docId);
  
  // Get doc name for database
  try {
    var file = DriveApp.getFileById(docId);
    report.docName = file.getName();
  } catch (e) {
    report.docName = "Untitled Doc";
  }
  
  // Also get the latest content for AI style analysis
  try {
    var latestRev = revisions[revisions.length - 1];
    var text = getRevisionContent(docId, latestRev.id);
    var aiInsight = analyzeTextStyle(text, rubric);
    report.aiInsight = aiInsight;
    report.processQuestions = generateProcessQuestions(report);
  } catch (e) {
    report.aiInsight = { error: "AI analysis failed: " + e.message };
  }
  
  return report;
}
