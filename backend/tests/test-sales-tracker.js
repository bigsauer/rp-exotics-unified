const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Test sales tracker functionality
async function testSalesTracker() {
  console.log('🧪 Testing RP Exotics Sales Tracker API\n');

  let authToken = '';
  let testDealId = '';

  try {
    // 1. Login as sales user
    console.log('1️⃣ Logging in as sales user...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'brennan@rpexotics.com',
      password: '1026'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Sales login successful');
    console.log('   User:', loginResponse.data.user.profile.displayName);
    console.log('   Role:', loginResponse.data.user.role);
    console.log('');

    // 2. Create a new sales deal
    console.log('2️⃣ Creating new sales deal...');
    const newDeal = {
      vehicle: '2023 McLaren 720S Spider',
      vin: 'SBM14FCA4LW004369',
      stockNumber: 'MC720S-001',
      year: 2023,
      make: 'McLaren',
      model: '720S Spider',
      customer: {
        name: 'John Smith',
        type: 'individual',
        contact: {
          email: 'john.smith@email.com',
          phone: '555-123-4567',
          address: '123 Main St, Miami, FL 33101',
          preferredContact: 'email'
        },
        notes: 'VIP customer, interested in financing',
        source: 'website',
        tags: ['vip', 'first-time-buyer']
      },
      financial: {
        purchasePrice: 285000,
        listPrice: 320000,
        expectedMargin: 35000,
        commission: {
          rate: 0.05,
          estimatedAmount: 14250
        }
      },
      timeline: {
        purchaseDate: new Date(),
        estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        milestones: [
          {
            stage: 'purchased',
            expectedDate: new Date(),
            actualDate: new Date(),
            status: 'completed',
            notes: 'Vehicle purchased successfully'
          }
        ]
      },
      currentStage: 'purchased',
      priority: 'high',
      status: 'active'
    };

    const createDealResponse = await axios.post(`${BASE_URL}/sales/deals`, newDeal, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    testDealId = createDealResponse.data.deal._id;
    console.log('✅ Sales deal created successfully');
    console.log('   Deal ID:', testDealId);
    console.log('   Vehicle:', createDealResponse.data.deal.vehicle);
    console.log('   Customer:', createDealResponse.data.deal.customer.name);
    console.log('');

    // 3. Get deals with filtering
    console.log('3️⃣ Testing deal filtering...');
    const dealsResponse = await axios.get(`${BASE_URL}/sales/deals?limit=5`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Deals retrieved successfully');
    console.log('   Total deals:', dealsResponse.data.total);
    console.log('   Current page:', dealsResponse.data.currentPage);
    console.log('   Deals returned:', dealsResponse.data.deals.length);
    console.log('');

    // 4. Get specific deal details
    console.log('4️⃣ Getting specific deal details...');
    const dealDetailsResponse = await axios.get(`${BASE_URL}/sales/deals/${testDealId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Deal details retrieved successfully');
    console.log('   Vehicle:', dealDetailsResponse.data.vehicle);
    console.log('   Current Stage:', dealDetailsResponse.data.currentStage);
    console.log('   Priority:', dealDetailsResponse.data.priority);
    console.log('   Progress:', dealDetailsResponse.data.calculatedMetrics.progressPercentage + '%');
    console.log('   Timeline Status:', dealDetailsResponse.data.calculatedMetrics.timelineStatus);
    console.log('');

    // 5. Send message to back office
    console.log('5️⃣ Sending message to back office...');
    const messageData = {
      message: 'Please expedite the title processing for this VIP customer. They are eager to take delivery.',
      urgent: true,
      recipients: [
        { userId: null, name: 'Back Office Team', role: 'back-office' }
      ]
    };

    const messageResponse = await axios.post(`${BASE_URL}/sales/deals/${testDealId}/message`, messageData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Message sent successfully');
    console.log('   Message:', messageResponse.data.communication.content);
    console.log('   Urgent:', messageResponse.data.communication.urgent);
    console.log('');

    // 6. Log customer interaction
    console.log('6️⃣ Logging customer interaction...');
    const interactionData = {
      type: 'call',
      duration: 15,
      outcome: 'positive',
      summary: 'Customer called to check on progress. Very excited about the car.',
      nextAction: 'Follow up with title status update',
      scheduledFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
    };

    const interactionResponse = await axios.post(`${BASE_URL}/sales/deals/${testDealId}/customer-interaction`, interactionData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Customer interaction logged successfully');
    console.log('   Type:', interactionResponse.data.interaction.type);
    console.log('   Duration:', interactionResponse.data.interaction.duration + ' minutes');
    console.log('   Outcome:', interactionResponse.data.interaction.outcome);
    console.log('');

    // 7. Create sales action
    console.log('7️⃣ Creating sales action...');
    const actionData = {
      action: 'follow-up-customer',
      description: 'Call customer with title processing update',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      priority: 'high'
    };

    const actionResponse = await axios.post(`${BASE_URL}/sales/deals/${testDealId}/actions`, actionData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Sales action created successfully');
    console.log('   Action:', actionResponse.data.action.action);
    console.log('   Description:', actionResponse.data.action.description);
    console.log('   Due Date:', new Date(actionResponse.data.action.dueDate).toLocaleDateString());
    console.log('');

    // 8. Move deal to next stage
    console.log('8️⃣ Moving deal to next stage...');
    const stageData = {
      newStage: 'documentation',
      notes: 'All purchase documents completed and submitted'
    };

    const stageResponse = await axios.put(`${BASE_URL}/sales/deals/${testDealId}/stage`, stageData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Deal moved to next stage successfully');
    console.log('   Previous Stage:', stageResponse.data.deal.previousStage);
    console.log('   Current Stage:', stageResponse.data.deal.currentStage);
    console.log('');

    // 9. Update deal priority
    console.log('9️⃣ Updating deal priority...');
    const priorityData = {
      priority: 'urgent',
      reason: 'Customer has upcoming travel plans and needs vehicle before departure'
    };

    const priorityResponse = await axios.put(`${BASE_URL}/sales/deals/${testDealId}/priority`, priorityData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Deal priority updated successfully');
    console.log('   New Priority:', priorityResponse.data.deal.priority);
    console.log('');

    // 10. Get dashboard statistics
    console.log('🔟 Getting dashboard statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/sales/dashboard/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Dashboard stats retrieved successfully');
    console.log('   Total Active Deals:', statsResponse.data.totalActiveDeals);
    console.log('   Stage Distribution:', statsResponse.data.stageDistribution.length, 'stages');
    console.log('   Priority Distribution:', statsResponse.data.priorityDistribution.length, 'priorities');
    console.log('');

    // 11. Get notifications
    console.log('1️⃣1️⃣ Getting notifications...');
    const notificationsResponse = await axios.get(`${BASE_URL}/sales/notifications?unreadOnly=true`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Notifications retrieved successfully');
    console.log('   Unread Notifications:', notificationsResponse.data.length);
    console.log('');

    // 12. Get communication history
    console.log('1️⃣2️⃣ Getting communication history...');
    const communicationsResponse = await axios.get(`${BASE_URL}/sales/deals/${testDealId}/communications`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Communication history retrieved successfully');
    console.log('   Communications:', communicationsResponse.data.length);
    console.log('');

    // 13. Update customer information
    console.log('1️⃣3️⃣ Updating customer information...');
    const customerUpdateData = {
      contact: {
        phone: '555-987-6543',
        preferredContact: 'phone'
      },
      notes: 'Customer prefers phone calls over email. Available after 6 PM.'
    };

    const customerUpdateResponse = await axios.put(`${BASE_URL}/sales/deals/${testDealId}/customer`, customerUpdateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Customer information updated successfully');
    console.log('   New Phone:', customerUpdateResponse.data.customer.contact.phone);
    console.log('   Preferred Contact:', customerUpdateResponse.data.customer.contact.preferredContact);
    console.log('');

    // 14. Test deal filtering with search
    console.log('1️⃣4️⃣ Testing deal search...');
    const searchResponse = await axios.get(`${BASE_URL}/sales/deals?search=McLaren&stage=documentation&priority=urgent`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Deal search completed successfully');
    console.log('   Search Results:', searchResponse.data.deals.length);
    console.log('   Applied Filters: search=McLaren, stage=documentation, priority=urgent');
    console.log('');

    console.log('🎉 All sales tracker tests completed successfully!');
    console.log('\n📋 Sales Tracker Features Tested:');
    console.log('==================================');
    console.log('✅ Deal Creation and Management');
    console.log('✅ Customer Information Management');
    console.log('✅ Communication with Back Office');
    console.log('✅ Customer Interaction Logging');
    console.log('✅ Sales Actions and Reminders');
    console.log('✅ Stage Progression Tracking');
    console.log('✅ Priority Management');
    console.log('✅ Dashboard Statistics');
    console.log('✅ Notifications System');
    console.log('✅ Search and Filtering');
    console.log('✅ Performance Metrics Calculation');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('   Status:', error.response.status);
    }
  }
}

// Run the tests
testSalesTracker(); 