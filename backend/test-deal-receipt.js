const emailService = require('./services/emailService');

async function testDealReceipt() {
  console.log('🧪 Testing Deal Receipt Email...\n');
  
  // Replace with your actual email address
  const testEmail = 'your-email@example.com'; // Change this to your email
  
  console.log('📧 Sending deal receipt to:', testEmail);
  
  const result = await emailService.sendDealReceipt(testEmail, {
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
  
  console.log('Result:', result.success ? '✅ Success' : '❌ Failed');
  if (!result.success) {
    console.log('Error:', result.error);
  } else {
    console.log('Email sent successfully! Check your inbox.');
  }
}

// Run the test
testDealReceipt().catch(console.error); 