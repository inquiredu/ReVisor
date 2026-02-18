const fs = require('fs');
const vm = require('vm');
const path = require('path');

// 1. Read the source code
const codePath = path.join(__dirname, '../src/DriveService.gs');
const code = fs.readFileSync(codePath, 'utf8');

// 2. Mock UrlFetchApp
const mockUrlFetchApp = {
  fetchAll: (requests) => {
    console.log(`[Mock] UrlFetchApp.fetchAll called with ${requests.length} requests`);
    return requests.map(req => ({
      getResponseCode: () => 200,
      getContentText: () => `Content for ${req.url}`
    }));
  },
  fetch: (url, options) => {
     console.log(`[Mock] UrlFetchApp.fetch called for ${url}`);
     return {
        getResponseCode: () => 200,
        getContentText: () => `Single Content for ${url}`
     };
  }
};

const mockDrive = {
  Revisions: {
    list: (docId, options) => {
        return {
            items: [],
            nextPageToken: null
        }
    },
    get: (docId, revId) => {
        return {
            exportLinks: { 'text/plain': 'http://mock.url/export' }
        }
    }
  }
};

// 3. Setup VM Context
const sandbox = {
  Drive: mockDrive,
  console: console,
  ScriptApp: { getOAuthToken: () => 'mock_token' },
  UrlFetchApp: mockUrlFetchApp,
  DriveApp: {
      getFolderById: () => ({ getFilesByType: () => ({ hasNext: () => false }) }),
      getFileById: () => ({ getName: () => "Mock File" })
  },
  MimeType: { GOOGLE_DOCS: 'application/vnd.google-apps.document' },
  Utilities: { sleep: () => {} },
  fetchRevisionContentBatch: null // Will be populated
};

vm.createContext(sandbox);

// 4. Execute the code in the sandbox
try {
  vm.runInContext(code, sandbox);
} catch (e) {
  console.error('Error running code in sandbox:', e);
  process.exit(1);
}

// 5. Run the Test
try {
  console.log('Running fetchRevisionContentBatch...');
  const urls = ['http://url1', 'http://url2', 'http://url3'];
  const results = sandbox.fetchRevisionContentBatch(urls);

  console.log('Results:', results);

  if (results.length !== 3) throw new Error('Expected 3 results');
  if (results[0] !== 'Content for http://url1') throw new Error('Result 1 mismatch');
  if (results[1] !== 'Content for http://url2') throw new Error('Result 2 mismatch');
  if (results[2] !== 'Content for http://url3') throw new Error('Result 3 mismatch');

  console.log('✅ Batch Fetch Test Passed!');
} catch (e) {
  console.error('❌ Test Failed:', e);
  process.exit(1);
}
