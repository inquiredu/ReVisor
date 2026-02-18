/**
 * GeminiService.gs
 * Handles interactions with the Google Gemini API for style and voice analysis.
 */

var GEMINI_MODEL = 'gemini-2.0-flash'; // Using latest flash for performance/speed
var GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';

/**
 * Analyzes text for style and consistency using Gemini.
 * 
 * @param {string} text - The text content to analyze.
 * @param {string} [rubric] - Optional rubric or focus criteria.
 * @returns {Object} Analysis result.
 */
function analyzeTextStyle(text, rubric) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    return { error: "Gemini API Key is missing. Run SETUP_API_KEY() first." };
  }

  var prompt = "You are a writing process expert assistant for teachers. Analyze the following document text for voice consistency, vocabulary sophistication, and style. " +
               (rubric ? "\n\nCRITICAL EVALUATION CRITERIA:\n" + rubric : "\n\nContext: Student assignment") + "\n\n" +
               "Text to analyze:\n" + text.substring(0, 15000) + "\n\n" + 
               "Return a JSON object with: " +
               "1. 'voiceConsistency' (0-100) " +
               "2. 'vocabularyLevel' (e.g., 'Grade 8', 'College') " +
               "3. 'styleNotes' (string) " +
               "4. 'flags' (array of strings) " +
               "5. 'rubricAlignment' (string, how well it meets the criteria if provided) " +
               "6. 'inquiryQuestions' (array of 3 non-accusatory questions for the student).";

  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  };

  try {
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(GEMINI_API_URL + '?key=' + apiKey, options);
    var json = JSON.parse(response.getContentText());
    
    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      return JSON.parse(json.candidates[0].content.parts[0].text);
    } else {
      console.error('Gemini API Error: ' + response.getContentText());
      return { error: "Unexpected API response format." };
    }
  } catch (e) {
    console.error('Gemini call failed: ' + e.message);
    return { error: "Failed to connect to Gemini API." };
  }
}

/**
 * Analyzes a document process summary for pedagogical framing.
 * 
 * @param {Object} report - The output from AnalysisEngine.
 * @returns {Array<string>} List of questions for the teacher.
 */
function generateProcessQuestions(report) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return ["Please configure Gemini API Key for process questions."];

  var summary = "Document analysis results: " +
                "Total revisions: " + report.metrics.totalRevisions + ", " +
                "Duration: " + (report.metrics.durationMs / 60000).toFixed(1) + " minutes, " +
                "Flags: " + report.flags.map(f => f.type).join(', ');

  var prompt = "Given this document revision analysis, generate 3 non-confrontational questions a teacher can ask a student to understand their writing process better.\n\n" +
               summary + "\n\nReturn JSON: { 'questions': [string, string, string] }";

  try {
    var response = UrlFetchApp.fetch(GEMINI_API_URL + '?key=' + apiKey, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });
    
    var json = JSON.parse(response.getContentText());
    var result = JSON.parse(json.candidates[0].content.parts[0].text);
    return result.questions || [];
  } catch (e) {
    return ["Tell me about your writing process for this piece.", "How did you approach drafting this document?", "What was the most challenging part of this assignment?"];
  }
}
