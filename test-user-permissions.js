const testUsers = [
  { email: 'chris@rpexotics.com', password: 'Matti11!', role: 'admin' },
  { email: 'parker@rpexotics.com', password: '1234', role: 'sales' },
  { email: 'lynn@rpexotics.com', password: 'titles123', role: 'finance' }
];

async function testUserPermissions() {
  console.log('🧪 Testing User Permissions and Dynamic Landing Page\n');
  
  for (const user of testUsers) {
    console.log(`\n👤 Testing ${user.role.toUpperCase()} user: ${user.email}`);
    console.log('─'.repeat(50));
    
    try {
      const response = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        })
      });
      
      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }
      
      const result = await response.json();
      const userData = result.user || result;
      
      console.log(`✅ Login successful`);
      console.log(`📝 User: ${userData.profile?.displayName || userData.firstName} ${userData.lastName}`);
      console.log(`🎭 Role: ${userData.role}`);
      console.log(`📧 Email: ${userData.email}`);
      
      // Check permissions
      const permissions = userData.permissions || {};
      console.log('\n🔐 Permissions:');
      console.log(`   • Can Create Deals: ${permissions.canCreateDeals ? '✅' : '❌'}`);
      console.log(`   • Can View Deals: ${permissions.canViewDeals ? '✅' : '❌'}`);
      console.log(`   • Can Search Dealers: ${permissions.canSearchDealers ? '✅' : '❌'}`);
      console.log(`   • Can View Financials: ${permissions.canViewFinancials ? '✅' : '❌'}`);
      console.log(`   • Can View Monthly Revenue: ${permissions.canViewMonthlyRevenue ? '✅' : '❌'}`);
      console.log(`   • Can Access Back Office: ${permissions.canAccessBackOffice ? '✅' : '❌'}`);
      console.log(`   • Can View Reports: ${permissions.canViewReports ? '✅' : '❌'}`);
      console.log(`   • Can Manage Users: ${permissions.canManageUsers ? '✅' : '❌'}`);
      
      // Expected dashboard content based on role
      console.log('\n📊 Expected Dashboard Content:');
      if (permissions.canViewDeals) {
        console.log(`   • Deal Tracker: ✅ (${userData.role === 'admin' ? 'All Deals' : 'My Deals'})`);
      }
      if (permissions.canViewMonthlyRevenue) {
        console.log(`   • Monthly Revenue Stats: ✅ ($2.1M)`);
      } else {
        console.log(`   • Monthly Revenue Stats: ❌ (Restricted)`);
      }
      if (permissions.canCreateDeals) {
        console.log(`   • New Deal Entry Action: ✅`);
      } else {
        console.log(`   • New Deal Entry Action: ❌`);
      }
      if (permissions.canAccessBackOffice) {
        console.log(`   • Back Office Operations: ✅`);
      } else {
        console.log(`   • Back Office Operations: ❌`);
      }
      if (permissions.canManageUsers) {
        console.log(`   • User Management: ✅`);
      } else {
        console.log(`   • User Management: ❌`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Permission testing complete!');
  console.log('\n💡 To test the dynamic landing page:');
  console.log('   1. Open http://localhost:3000 in your browser');
  console.log('   2. Login with different user accounts');
  console.log('   3. Observe how the dashboard content changes based on role');
}

testUserPermissions().catch(console.error); 