/**
 * Lists all Google Docs within a given folder ID.
 * 
 * @param {string} folderId - The ID of the folder to search.
 * @returns {Array<Object>} List of documents.
 */
function listDocumentsInFolder(folderId) {
  if (!folderId) throw new Error("Folder ID is required.");
  
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFilesByType(MimeType.GOOGLE_DOCS);
  var docs = [];
  
  while (files.hasNext()) {
    var file = files.next();
    docs.push({
      id: file.getId(),
      name: file.getName(),
      lastUpdated: file.getLastUpdated()
    });
  }
  
  return docs;
}

/**
 * Fetches the revision history for a specific Google Doc ID.
 * Uses the Drive API (Advanced Service).
 * 
 * @param {string} docId - The ID of the Google Doc.
 * @returns {Array<Object>} List of analyzed revisions.
 */
function getRevisionHistory(docId) {
  if (!docId) {
    throw new Error("Document ID is required.");
  }

  var revisions = [];
  var pageToken = null;

  try {
    do {
      // Request specific fields to reduce payload size (Bolt Optimization)
      // v2 fields: items(id,modifiedDate,lastModifyingUserName,lastModifyingUser(displayName),fileSize)
      var response = Drive.Revisions.list(docId, {
        pageToken: pageToken,
        fields: "items(id,modifiedDate,lastModifyingUserName,lastModifyingUser(displayName),fileSize),nextPageToken"
      });
      
      // Handle v2 'items' or v3 'revisions'
      var fetched = response.items || response.revisions || [];
      revisions = revisions.concat(fetched);
      
      pageToken = response.nextPageToken;
    } while (pageToken);

    return analyzeRevisions(revisions);

  } catch (e) {
    console.error('Error fetching revisions for docId ' + docId + ': ' + e.message);
    if (e && e.message && e.message.indexOf('Drive is not defined') !== -1) {
       throw new Error('Drive API Service not enabled. Please enable "Drive API" in the Script Editor > Services.');
    }
    throw new Error('Failed to fetch revision history: ' + e.message);
  }
}

/**
 * Normalizes and analyzes raw revision data.
 * 
 * @param {Array<Object>} revisions - Raw revision objects from Drive API.
 * @returns {Array<Object>} Simplified revision objects.
 */
function analyzeRevisions(revisions) {
  // Normalize fields between API versions
  var normalized = revisions.map(normalizeRevision);

  // Sort by Date (Oldest First)
  normalized.sort(function(a, b) {
    return new Date(a.modifiedDate) - new Date(b.modifiedDate);
  });

  // Map to a cleaner structure for the frontend
  return normalized.map(function(rev) {
    return {
      id: rev.id,
      modifiedDate: rev.modifiedDate,
      lastModifyingUserName: rev.lastModifyingUserName,
      fileSize: rev.original.fileSize || 0 
    };
  });
}

/**
 * Helper to normalize Revision objects between Drive API v2 and v3.
 * 
 * @param {Object} rev - The raw revision object.
 * @returns {Object} Normalized revision object.
 */
function normalizeRevision(rev) {
  if (!rev) return null;
  return {
    id: rev.id,
    // v2 uses modifiedDate, v3 uses modifiedTime
    modifiedDate: rev.modifiedDate || rev.modifiedTime,
    // v2 uses lastModifyingUserName, v3 uses lastModifyingUser.displayName
    lastModifyingUserName: rev.lastModifyingUserName || (rev.lastModifyingUser ? rev.lastModifyingUser.displayName : 'Unknown'),
    // Preserve original object for deep inspection if needed
    original: rev 
  };
}

/**
 * Fetches content of a specific revision with retry logic for 429 errors.
 * 
 * @param {string} docId - The Google Doc ID.
 * @param {string} revisionId - The ID of the revision to fetch.
 * @returns {string} The text content of the revision.
 */
function getRevisionContent(docId, revisionId) {
  if (!docId || !revisionId) {
    throw new Error("Doc ID and Revision ID are required.");
  }

  var maxRetries = 3;
  var waitTime = 1000; // Start with 1s

  for (var i = 0; i <= maxRetries; i++) {
    try {
      var revision = Drive.Revisions.get(docId, revisionId);
      var exportLinks = revision.exportLinks;
      var url = (exportLinks && exportLinks['text/plain']) ? 
                exportLinks['text/plain'] : 
                "https://docs.google.com/feeds/download/documents/export/Export?id=" + docId + "&revision=" + revisionId + "&exportFormat=txt";

      var token = ScriptApp.getOAuthToken();
      var response = UrlFetchApp.fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      });

      var code = response.getResponseCode();
      
      if (code === 200) {
        return response.getContentText();
      } else if (code === 429 && i < maxRetries) {
        // Rate limited - wait and retry
        console.warn("429 Rate Limit hit. Retrying in " + waitTime + "ms...");
        Utilities.sleep(waitTime);
        waitTime *= 2; // Exponential backoff
        continue;
      } else {
        throw new Error("API returned code " + code + ": " + response.getContentText().substring(0, 100));
      }
    } catch (e) {
      if (i === maxRetries) {
        console.error("Error loading content after " + maxRetries + " retries: " + e.message);
        return "Error loading content: " + e.message;
      }
      Utilities.sleep(waitTime);
      waitTime *= 2;
    }
  }
}
