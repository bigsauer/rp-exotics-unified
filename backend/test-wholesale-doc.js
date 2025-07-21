const documentGenerator = require('./services/documentGenerator');

// Test data for wholesale purchase order
const testDealData = {
  year: 2024,
  make: 'McLaren',
  model: '720S',
  vin: 'SBM12AA46KW123456',
  stockNumber: 'RP2025001',
  color: 'Volcano Yellow',
  interiorColor: 'Black Alcantara',
  mileage: 12000,
  purchasePrice: 285000,
  dealType: 'wholesale',
  sellerInfo: {
    name: 'Premium Auto Group',
    phone: '(555) 123-4567',
    address: '1234 Business Blvd',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    email: 'sales@premiumautogroup.com'
  },
  paymentMethod: 'Wire Transfer',
  paymentTerms: 'Net 30 Days',
  titleStatus: 'Clear Title in Hand',
  deliveryDate: '2024-12-15',
  notes: 'Vehicle in excellent condition. All service records available. No accidents.',
  vehicleDescription: '2024 McLaren 720S in pristine condition. Single owner, full service history. Includes all original documentation and keys.'
};

const testUser = {
  firstName: 'John',
  lastName: 'Smith',
  id: 'test-user-123'
};

async function testWholesalePurchaseOrder() {
  try {
    console.log('Testing Wholesale Purchase Order Generation...');
    console.log('Test Data:', JSON.stringify(testDealData, null, 2));
    
    const result = await documentGenerator.generateWholesalePurchaseOrder(testDealData, testUser);
    
    console.log('✅ Wholesale Purchase Order generated successfully!');
    console.log('Result:', result);
    console.log(`📄 File: ${result.fileName}`);
    console.log(`📊 Size: ${result.fileSize} bytes`);
    console.log(`🔢 Document Number: ${result.documentNumber}`);
    
  } catch (error) {
    console.error('❌ Error generating wholesale purchase order:', error);
  }
}

// Run the test
testWholesalePurchaseOrder(); 