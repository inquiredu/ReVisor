/**
 * Code.gs
 * Main entry point for the Learning Evidence Analyzer Web App.
 */

/**
 * Serves the web app UI.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Learning Evidence Analyzer')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
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
 * API: Fetches content for a specific revision.
 * Exposed to client-side JS.
 */
function apiGetRevisionContent(docId, revId) {
  return getRevisionContent(docId, revId);
}

/**
 * API: Analyzes a document.
 */
function apiAnalyzeDocument(docId) {
  var revisions = getRevisionHistory(docId);
  // In a real app, we might fetch content here or let the client drive it
  return analyzeRevisionPatterns(revisions, docId);
}