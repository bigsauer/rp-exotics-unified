const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  API_BASE: process.env.API_BASE || 'http://localhost:3001',
  TEST_USER: {
    email: 'clayton@rp-exotics.com',
    password: 'test123'
  },
  TEST_DOCUMENT: {
    url: 'https://opis-documents.s3.amazonaws.com/test-document.pdf', // Replace with actual test document
    type: 'wholesale_bos'
  }
};

// Debug logging
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[SIGNATURE DEBUG TEST] [${timestamp}] ${message}`);
  if (data) {
    console.log(`[SIGNATURE DEBUG TEST] [${timestamp}] Data:`, JSON.stringify(data, null, 2));
  }
};

const errorLog = (message, error = null) => {
  const timestamp = new Date().toISOString();
  console.error(`[SIGNATURE DEBUG TEST] [${timestamp}] ERROR: ${message}`);
  if (error) {
    console.error(`[SIGNATURE DEBUG TEST] [${timestamp}] Error details:`, error);
  }
};

// Authentication helper
async function authenticate() {
  try {
    debugLog('Authenticating test user...');
    
    const response = await fetch(`${TEST_CONFIG.API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_CONFIG.TEST_USER.email,
        password: TEST_CONFIG.TEST_USER.password
      })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    debugLog('Authentication successful', {
      userId: data.user.id,
      userEmail: data.user.email,
      userRole: data.user.role
    });

    return data.token;
  } catch (error) {
    errorLog('Authentication failed', error);
    throw error;
  }
}

// Test signature creation with debugging
async function testSignatureCreation(token) {
  try {
    debugLog('Testing signature creation with comprehensive debugging...');

    // Create test signature data
    const signatureData = {
      documentUrl: TEST_CONFIG.TEST_DOCUMENT.url,
      documentType: TEST_CONFIG.TEST_DOCUMENT.type,
      signatureType: 'image',
      signatureImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 pixel PNG
      typedSignature: 'Test Signature',
      auditTrail: {
        ipAddress: '127.0.0.1',
        userAgent: 'Signature Debug Test/1.0',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        language: 'en-US',
        sessionId: 'test-session-123',
        consentGiven: true,
        consentTimestamp: new Date().toISOString()
      },
      clientEmail: 'test@example.com'
    };

    debugLog('Signature request data prepared', {
      documentType: signatureData.documentType,
      signatureType: signatureData.signatureType,
      hasImageSignature: !!signatureData.signatureImage,
      hasTypedSignature: !!signatureData.typedSignature,
      auditTrailPresent: !!signatureData.auditTrail
    });

    // Send signature creation request
    const response = await fetch(`${TEST_CONFIG.API_BASE}/api/signatures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(signatureData)
    });

    debugLog('Signature creation response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      errorLog('Signature creation failed', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Signature creation failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    debugLog('Signature creation successful', {
      signatureId: result.signatureId,
      signedDocumentUrl: result.signedDocumentUrl,
      success: result.success
    });

    return result;
  } catch (error) {
    errorLog('Signature creation test failed', error);
    throw error;
  }
}

// Test signature compliance report
async function testComplianceReport(token, signatureId) {
  try {
    debugLog('Testing compliance report generation...', { signatureId });

    const response = await fetch(`${TEST_CONFIG.API_BASE}/api/signatures/${signatureId}/compliance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    debugLog('Compliance report response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      errorLog('Compliance report failed', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Compliance report failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    debugLog('Compliance report generated successfully', {
      signatureId: result.signatureId,
      overallCompliance: result.complianceReport.overallCompliance,
      complianceScore: result.complianceReport.complianceScore,
      requirements: Object.keys(result.complianceReport.requirements || {})
    });

    return result;
  } catch (error) {
    errorLog('Compliance report test failed', error);
    throw error;
  }
}

// Test document download
async function testDocumentDownload(token, signatureId) {
  try {
    debugLog('Testing signed document download...', { signatureId });

    const response = await fetch(`${TEST_CONFIG.API_BASE}/api/signatures/${signatureId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    debugLog('Download response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });

    if (!response.ok) {
      const errorText = await response.text();
      errorLog('Document download failed', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Document download failed: ${response.status} ${response.statusText}`);
    }

    // Check if it's a redirect
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      debugLog('Download redirect detected', { location });
      return { type: 'redirect', location };
    }

    // If it's a direct download, save the file
    const buffer = await response.buffer();
    const fileName = `signed-document-${signatureId}.pdf`;
    await fs.writeFile(fileName, buffer);
    
    debugLog('Document downloaded and saved', {
      fileName,
      fileSize: buffer.length,
      savedPath: path.resolve(fileName)
    });

    return { type: 'download', fileName, fileSize: buffer.length };
  } catch (error) {
    errorLog('Document download test failed', error);
    throw error;
  }
}

// Test client signature request
async function testClientSignatureRequest(token, signatureId) {
  try {
    debugLog('Testing client signature request...', { signatureId });

    const response = await fetch(`${TEST_CONFIG.API_BASE}/api/signatures/${signatureId}/send-to-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        clientEmail: 'client@example.com'
      })
    });

    debugLog('Client signature request response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      errorLog('Client signature request failed', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Client signature request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    debugLog('Client signature request successful', {
      clientSignatureId: result.clientSignatureId,
      success: result.success
    });

    return result;
  } catch (error) {
    errorLog('Client signature request test failed', error);
    throw error;
  }
}

// Main test function
async function runSignatureDebugTests() {
  try {
    debugLog('Starting signature debugging tests...');
    debugLog('Test configuration', TEST_CONFIG);

    // Step 1: Authenticate
    const token = await authenticate();

    // Step 2: Test signature creation
    debugLog('=== STEP 1: SIGNATURE CREATION TEST ===');
    const signatureResult = await testSignatureCreation(token);

    // Step 3: Test compliance report
    debugLog('=== STEP 2: COMPLIANCE REPORT TEST ===');
    const complianceResult = await testComplianceReport(token, signatureResult.signatureId);

    // Step 4: Test document download
    debugLog('=== STEP 3: DOCUMENT DOWNLOAD TEST ===');
    const downloadResult = await testDocumentDownload(token, signatureResult.signatureId);

    // Step 5: Test client signature request
    debugLog('=== STEP 4: CLIENT SIGNATURE REQUEST TEST ===');
    const clientResult = await testClientSignatureRequest(token, signatureResult.signatureId);

    // Summary
    debugLog('=== SIGNATURE DEBUGGING TESTS COMPLETED ===');
    debugLog('Test results summary', {
      signatureCreation: '✅ PASSED',
      complianceReport: '✅ PASSED',
      documentDownload: '✅ PASSED',
      clientRequest: '✅ PASSED',
      signatureId: signatureResult.signatureId,
      signedDocumentUrl: signatureResult.signedDocumentUrl,
      clientSignatureId: clientResult.clientSignatureId
    });

    debugLog('All signature debugging tests passed successfully! 🎉');

  } catch (error) {
    errorLog('Signature debugging tests failed', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runSignatureDebugTests();
}

module.exports = {
  runSignatureDebugTests,
  testSignatureCreation,
  testComplianceReport,
  testDocumentDownload,
  testClientSignatureRequest
}; 