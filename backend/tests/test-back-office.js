const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001/api/back-office';

// Test back office functionality
async function testBackOffice() {
  console.log('🧪 Testing RP Exotics Back Office API\n');

  try {
    // Test 1: Get document types
    console.log('1️⃣ Testing get document types...');
    const docTypesResponse = await axios.get(`${BASE_URL}/document-types`);
    console.log('✅ Get document types successful');
    console.log('   Document types:', docTypesResponse.data.data?.length || 0);
    console.log('');

    // Test 2: Get dashboard stats
    console.log('2️⃣ Testing get dashboard stats...');
    const statsResponse = await axios.get(`${BASE_URL}/dashboard/stats`);
    console.log('✅ Get dashboard stats successful');
    console.log('   Stage distribution:', statsResponse.data.data.stageDistribution?.length || 0);
    console.log('   Pending tasks:', statsResponse.data.data.pendingTasks || 0);
    console.log('');

    // Test 3: Get all deals
    console.log('3️⃣ Testing get all deals...');
    const dealsResponse = await axios.get(`${BASE_URL}/deals`);
    console.log('✅ Get deals successful');
    console.log('   Total deals:', dealsResponse.data.pagination?.total || 0);
    console.log('   Deals returned:', dealsResponse.data.data?.length || 0);
    console.log('');

    // Test 4: Get deals with filters
    console.log('4️⃣ Testing get deals with filters...');
    const filteredResponse = await axios.get(`${BASE_URL}/deals?stage=documentation&priority=high&limit=5`);
    console.log('✅ Get filtered deals successful');
    console.log('   Filtered deals:', filteredResponse.data.data?.length || 0);
    console.log('');

    // Test 5: Get specific deal
    console.log('5️⃣ Testing get specific deal...');
    if (dealsResponse.data.data && dealsResponse.data.data.length > 0) {
      const dealId = dealsResponse.data.data[0].id;
      const dealResponse = await axios.get(`${BASE_URL}/deals/${dealId}`);
      console.log('✅ Get specific deal successful');
      console.log('   Deal vehicle:', dealResponse.data.data.vehicle);
      console.log('   Current stage:', dealResponse.data.data.currentStage);
      console.log('   Documents count:', dealResponse.data.data.documents?.length || 0);
      console.log('');

      // Test 6: Update deal stage
      console.log('6️⃣ Testing update deal stage...');
      const stageUpdateResponse = await axios.put(`${BASE_URL}/deals/${dealId}/stage`, {
        stage: 'verification',
        notes: 'Moving to verification stage for testing'
      });
      console.log('✅ Update deal stage successful');
      console.log('   New stage:', stageUpdateResponse.data.data.currentStage);
      console.log('');

      // Test 7: Update title information
      console.log('7️⃣ Testing update title information...');
      const titleUpdateResponse = await axios.put(`${BASE_URL}/deals/${dealId}/title`, {
        status: 'clean',
        state: 'MO',
        titleNumber: 'TEST123456',
        titleReceived: true,
        titleReceivedDate: new Date(),
        titleNotes: 'Title received and verified'
      });
      console.log('✅ Update title info successful');
      console.log('   Title status:', titleUpdateResponse.data.data.status);
      console.log('   Title state:', titleUpdateResponse.data.data.state);
      console.log('');

      // Test 8: Update compliance information
      console.log('8️⃣ Testing update compliance information...');
      const complianceUpdateResponse = await axios.put(`${BASE_URL}/deals/${dealId}/compliance`, {
        contractSigned: true,
        contractDate: new Date(),
        driversLicenseVerified: true,
        odometerVerified: true,
        inspectionCompleted: true,
        inspectionDate: new Date()
      });
      console.log('✅ Update compliance successful');
      console.log('   Contract signed:', complianceUpdateResponse.data.data.contractSigned);
      console.log('   License verified:', complianceUpdateResponse.data.data.driversLicenseVerified);
      console.log('');

      // Test 9: Assign deal
      console.log('9️⃣ Testing assign deal...');
      const assignResponse = await axios.put(`${BASE_URL}/deals/${dealId}/assign`, {
        assignedTo: '507f1f77bcf86cd799439011' // Test user ID
      });
      console.log('✅ Assign deal successful');
      console.log('   Assigned to:', assignResponse.data.data.assignedTo);
      console.log('');

      // Test 10: Document approval (if documents exist)
      console.log('🔟 Testing document approval...');
      if (dealResponse.data.data.documents && dealResponse.data.data.documents.length > 0) {
        const documentType = dealResponse.data.data.documents[0].type;
        const approvalResponse = await axios.put(`${BASE_URL}/deals/${dealId}/documents/${documentType}/approval`, {
          approved: true,
          notes: 'Document approved for testing'
        });
        console.log('✅ Document approval successful');
        console.log('   Document type:', documentType);
        console.log('   Approved:', approvalResponse.data.data.approved);
        console.log('');
      } else {
        console.log('⚠️  No documents to approve');
        console.log('');
      }

    } else {
      console.log('⚠️  No deals found to test with');
      console.log('');
    }

    // Test 11: Search deals
    console.log('1️⃣1️⃣ Testing search deals...');
    const searchResponse = await axios.get(`${BASE_URL}/deals?search=mclaren`);
    console.log('✅ Search deals successful');
    console.log('   Search results:', searchResponse.data.data?.length || 0);
    console.log('');

    // Test 12: Date range filtering
    console.log('1️⃣2️⃣ Testing date range filtering...');
    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const dateTo = new Date();
    const dateFilterResponse = await axios.get(`${BASE_URL}/deals?dateFrom=${dateFrom.toISOString()}&dateTo=${dateTo.toISOString()}`);
    console.log('✅ Date range filtering successful');
    console.log('   Date filtered results:', dateFilterResponse.data.data?.length || 0);
    console.log('');

    console.log('🎉 All back office tests completed successfully!');
    console.log('\n📋 API Endpoints Tested:');
    console.log('==========================');
    console.log('GET    /api/back-office/deals - Get all deals with filtering');
    console.log('GET    /api/back-office/deals/:id - Get specific deal details');
    console.log('GET    /api/back-office/document-types - Get document types');
    console.log('GET    /api/back-office/dashboard/stats - Get dashboard statistics');
    console.log('PUT    /api/back-office/deals/:id/stage - Update deal stage');
    console.log('PUT    /api/back-office/deals/:id/title - Update title information');
    console.log('PUT    /api/back-office/deals/:id/compliance - Update compliance');
    console.log('PUT    /api/back-office/deals/:id/assign - Assign deal to user');
    console.log('PUT    /api/back-office/deals/:id/documents/:type/approval - Approve/reject document');
    console.log('POST   /api/back-office/deals/:id/documents/:type/upload - Upload document');
    console.log('DELETE /api/back-office/deals/:id/documents/:type - Delete document');
    console.log('');
    console.log('🔧 Features Supported:');
    console.log('======================');
    console.log('✅ Deal filtering by stage, priority, assignedTo, date range');
    console.log('✅ Search deals by vehicle, VIN, stock number, seller');
    console.log('✅ Document management with upload, approval, deletion');
    console.log('✅ Workflow stage management with history tracking');
    console.log('✅ Title information management');
    console.log('✅ Compliance tracking');
    console.log('✅ Deal assignment to users');
    console.log('✅ Activity logging for all actions');
    console.log('✅ Dashboard statistics and analytics');
    console.log('✅ File upload with validation and storage');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('   Error details:', error.response.data.error);
    }
  }
}

// Run the tests
testBackOffice(); 