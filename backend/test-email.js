const emailService = require('./services/emailService');

async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');

  // Test 1: Deal Status Update
  console.log('📧 Testing Deal Status Update Email...');
  const dealStatusResult = await emailService.sendDealStatusUpdate('test@example.com', {
    vin: '1FTFW1RG2KFC38883',
    year: '2019',
    make: 'Ford',
    model: 'F-150',
    currentStage: 'documentation'
  });
  console.log('Deal Status Result:', dealStatusResult.success ? '✅ Success' : '❌ Failed');
  if (!dealStatusResult.success) {
    console.log('Error:', dealStatusResult.error);
  }

  // Test 2: Document Upload Notification
  console.log('\n📧 Testing Document Upload Notification...');
  const docUploadResult = await emailService.sendDocumentUploadNotification('test@example.com', {
    vin: '1FTFW1RG2KFC38883'
  }, 'Bill of Sale');
  console.log('Document Upload Result:', docUploadResult.success ? '✅ Success' : '❌ Failed');
  if (!docUploadResult.success) {
    console.log('Error:', docUploadResult.error);
  }

  // Test 3: New Deal Notification
  console.log('\n📧 Testing New Deal Notification...');
  const newDealResult = await emailService.sendNewDealNotification('test@example.com', {
    vin: '1FTFW1RG2KFC38883',
    dealType: 'retail',
    currentStage: 'initial-contact'
  });
  console.log('New Deal Result:', newDealResult.success ? '✅ Success' : '❌ Failed');
  if (!newDealResult.success) {
    console.log('Error:', newDealResult.error);
  }

  // Test 4: System Alert
  console.log('\n📧 Testing System Alert...');
  const systemAlertResult = await emailService.sendSystemAlert('test@example.com', {
    title: 'System Maintenance',
    type: 'Maintenance',
    priority: 'Medium',
    message: 'Scheduled maintenance will occur tonight at 2 AM EST.'
  });
  console.log('System Alert Result:', systemAlertResult.success ? '✅ Success' : '❌ Failed');
  if (!systemAlertResult.success) {
    console.log('Error:', systemAlertResult.error);
  }

  // Test 5: Deal Receipt
  console.log('\n📧 Testing Deal Receipt...');
  const dealReceiptResult = await emailService.sendDealReceipt('test@example.com', {
    vin: '1FTFW1RG2KFC38883',
    rpStockNumber: 'RP2025001',
    year: '2019',
    make: 'Ford',
    model: 'F-150',
    dealType: 'retail',
    salesperson: 'Brennan',
    seller: { name: 'ABC Motors' },
    buyer: { name: 'XYZ Dealership' }
  }, [
    { name: 'Vehicle Record' },
    { name: 'Purchase Agreement' }
  ]);
  console.log('Deal Receipt Result:', dealReceiptResult.success ? '✅ Success' : '❌ Failed');
  if (!dealReceiptResult.success) {
    console.log('Error:', dealReceiptResult.error);
  }

  console.log('\n🎉 Email Service Testing Complete!');
  console.log('\n💡 To test with a real email address, use:');
  console.log('curl -X POST http://localhost:5001/api/email/test \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"to": "your-email@example.com", "type": "deal-status"}\'');
  console.log('\n📧 To test deal receipt specifically:');
  console.log('curl -X POST http://localhost:5001/api/email/deal-receipt \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"to": "your-email@example.com", "dealData": {"vin": "1FTFW1RG2KFC38883", "rpStockNumber": "RP2025001", "year": "2019", "make": "Ford", "model": "F-150", "dealType": "retail", "salesperson": "Brennan", "seller": {"name": "ABC Motors"}, "buyer": {"name": "XYZ Dealership"}}, "generatedDocuments": [{"name": "Vehicle Record"}, {"name": "Purchase Agreement"}]}\'');
}

// Run the test
testEmailService().catch(console.error); 