/**
 * AnalysisEngine.gs
 * Core logic for detecting patterns in revision history.
 */

/**
 * Analyzes a sequence of revisions for suspicious patterns.
 * 
 * @param {Array<Object>} revisions - The list of revision objects.
 * @param {string} docId - The ID of the document.
 * @returns {Object} Analysis report with flags and metrics.
 */
function analyzeRevisionPatterns(revisions, docId) {
  if (!revisions || revisions.length === 0) {
    return {
      docId: docId,
      flags: [{ type: 'NO_DATA', severity: 'RED', message: 'No revision data found.' }],
      metrics: { totalRevisions: 0, authors: [] }
    };
  }
  
  var report = {
    docId: docId,
    flags: [],
    metrics: {
      totalRevisions: revisions.length,
      authors: [],
      startTime: revisions[0].modifiedDate,
      endTime: revisions[revisions.length - 1].modifiedDate,
      durationMs: 0
    }
  };

  // 1. Author Analysis
  var authorMap = {};
  revisions.forEach(function(rev) {
    var author = rev.lastModifyingUserName || 'Unknown';
    authorMap[author] = (authorMap[author] || 0) + 1;
  });
  
  report.metrics.authors = Object.keys(authorMap).map(function(name) {
    return { name: name, count: authorMap[name], percentage: (authorMap[name] / revisions.length * 100).toFixed(1) };
  });

  if (Object.keys(authorMap).length > 3) {
    report.flags.push({
      type: 'HIGH_AUTHOR_COUNT',
      severity: 'YELLOW',
      message: 'Document has ' + Object.keys(authorMap).length + ' different contributors.'
    });
  }

  // 2. Timing Analysis
  var startTime = new Date(revisions[0].modifiedDate).getTime();
  var endTime = new Date(revisions[revisions.length - 1].modifiedDate).getTime();
  report.metrics.durationMs = endTime - startTime;
  
  var totalHours = report.metrics.durationMs / (1000 * 60 * 60);

  if (revisions.length < 5) {
    report.flags.push({
      type: 'LOW_REVISION_COUNT',
      severity: 'ORANGE',
      message: 'Very few revisions (' + revisions.length + ') found for this document.'
    });
  } else if (revisions.length > 5 && totalHours < 0.5) {
     report.flags.push({
      type: 'RAPID_WRITING',
      severity: 'YELLOW',
      message: 'Document was completed in less than 30 minutes.'
    });
  }

  // 3. Late Night / Unusual Hours (Optional)
  var lateNightCount = 0;
  revisions.forEach(function(rev) {
    var hour = new Date(rev.modifiedDate).getHours();
    if (hour >= 0 && hour <= 4) {
      lateNightCount++;
    }
  });
  
  if (lateNightCount > revisions.length * 0.5) {
    report.flags.push({
      type: 'UNUSUAL_HOURS',
      severity: 'YELLOW',
      message: 'More than 50% of revisions occurred between 12 AM and 5 AM.'
    });
  }

  return report;
}
