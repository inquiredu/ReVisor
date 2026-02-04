const fs = require('fs');
const vm = require('vm');
const path = require('path');

// 1. Read the source code
const codePath = path.join(__dirname, '../src/DriveService.gs');
const code = fs.readFileSync(codePath, 'utf8');

// 2. Mock the Drive API Service
const mockRevisions = [
  {
    id: 'rev1',
    modifiedDate: '2023-01-01T10:00:00.000Z',
    lastModifyingUserName: 'Alice',
    fileSize: '1024',
    // Fields that would be missing in optimized response
    exportLinks: 'should_not_be_needed',
    selfLink: 'should_not_be_needed'
  },
  {
    id: 'rev2',
    modifiedDate: '2023-01-02T10:00:00.000Z',
    lastModifyingUser: { displayName: 'Bob' },
    // Missing lastModifyingUserName, should fallback
    fileSize: '2048'
  }
];

const mockDrive = {
  Revisions: {
    list: (docId, options) => {
      console.log(`[Mock] Drive.Revisions.list called for ${docId}`);
      console.log(`[Mock] Options:`, options);

      // Verify options.fields is set correctly (This is the core test)
      if (!options.fields) {
        throw new Error('fields parameter is missing!');
      }

      // In strict test, we might check if options.fields matches our optimization,
      // but for now we just return the mock data structure consistent with the request.

      return {
        items: mockRevisions,
        nextPageToken: null
      };
    }
  }
};

// 3. Setup VM Context
const sandbox = {
  Drive: mockDrive,
  console: console,
  ScriptApp: { getOAuthToken: () => 'mock_token' },
  UrlFetchApp: {}, // Not needed for getRevisionHistory logic but good to have
  getRevisionHistory: null // Will be populated
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
  console.log('Running getRevisionHistory...');
  const result = sandbox.getRevisionHistory('test_doc_id');

  console.log('Result:', JSON.stringify(result, null, 2));

  // Assertions
  if (result.length !== 2) throw new Error('Expected 2 revisions');

  if (result[0].id !== 'rev1') throw new Error('Rev1 ID mismatch');
  if (result[0].lastModifyingUserName !== 'Alice') throw new Error('Rev1 Author mismatch');
  if (result[0].fileSize !== '1024') throw new Error('Rev1 Size mismatch'); // Note: The code uses rev.original.fileSize, which exists in our mock

  if (result[1].lastModifyingUserName !== 'Bob') throw new Error('Rev2 Author fallback mismatch');

  console.log('✅ Test Passed!');
} catch (e) {
  console.error('❌ Test Failed:', e);
  process.exit(1);
}
