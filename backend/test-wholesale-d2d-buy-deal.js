const mongoose = require('mongoose');
const SalesDeal = require('./models/SalesDeal');
require('dotenv').config();

async function testWholesaleD2DBuyDeal() {
  try {
    console.log('🧪 Testing wholesale D2D buy deal creation...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test data for wholesale D2D buy deal
    const testDealData = {
      // Vehicle Information
      vehicle: '2020 Honda Civic',
      vin: 'TEST12345678901234',
      year: 2020,
      make: 'Honda',
      model: 'Civic',
      mileage: 50000,
      exteriorColor: 'Blue',
      interiorColor: 'Black',
      
      // Deal Information
      dealType: 'wholesale-d2d',
      dealType2SubType: 'buy',
      fundingSource: 'cash',
      purchaseDate: new Date(),
      paymentMethod: 'check',
      currentStage: 'contract-received',
      
      // Financial Information
      purchasePrice: 15000,
      listPrice: 18000,
      instantOffer: 16000,
      wholesalePrice: 15500,
      commissionRate: 5,
      brokerageFee: 500,
      brokerageFeePaidTo: 'John Doe',
      payoffBalance: 12000,
      amountDueToCustomer: 3000,
      amountDueToRP: 1500,
      
      // Seller Information (this should be mapped to customer)
      seller: {
        name: 'ABC Motors',
        type: 'dealer',
        contact: {
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zip: '12345'
          },
          phone: '555-123-4567',
          email: 'contact@abcmotors.com'
        },
        licenseNumber: 'DL123456',
        tier: 'Tier 1',
        company: 'ABC Motors Inc'
      },
      
      // Stock number (this should be mapped to stockNumber)
      rpStockNumber: 'RP-TEST-001',
      
      // Additional Information
      vehicleDescription: 'Clean title, one owner, excellent condition',
      generalNotes: 'Test wholesale D2D buy deal',
      
      // Sales person information (will be set by the route)
      salesPerson: {
        id: new mongoose.Types.ObjectId(),
        name: 'Test Sales Person',
        email: 'sales@test.com',
        phone: '555-987-6543'
      }
    };
    
    console.log('\n📋 Test deal data:', JSON.stringify(testDealData, null, 2));
    
    // Test the data transformation logic
    console.log('\n🔧 Testing data transformation...');
    
    // Handle customer information for different deal types
    if (!testDealData.customer || !testDealData.customer.name) {
      // For wholesale D2D buy deals, customer might be in seller field
      if (testDealData.seller && testDealData.seller.name) {
        testDealData.customer = {
          name: testDealData.seller.name,
          type: testDealData.seller.type === 'dealer' ? 'dealer' : 'individual',
          contact: {
            email: testDealData.seller.contact?.email || testDealData.seller.email || '',
            phone: testDealData.seller.contact?.phone || testDealData.seller.phone || '',
            address: testDealData.seller.contact?.address ? 
              `${testDealData.seller.contact.address.street || ''}, ${testDealData.seller.contact.address.city || ''}, ${testDealData.seller.contact.address.state || ''} ${testDealData.seller.contact.address.zip || ''}` : '',
            preferredContact: 'email'
          },
          notes: testDealData.notes || testDealData.generalNotes || '',
          source: 'other'
        };
      } else {
        // Set a default customer name if none provided
        testDealData.customer = {
          name: 'Customer TBD',
          type: 'individual',
          contact: {
            email: '',
            phone: '',
            address: '',
            preferredContact: 'email'
          },
          notes: 'Customer information to be updated',
          source: 'other'
        };
      }
    }

    // Handle stockNumber for different deal types
    if (!testDealData.stockNumber) {
      // For wholesale D2D buy deals, stockNumber might be in rpStockNumber field
      if (testDealData.rpStockNumber) {
        testDealData.stockNumber = testDealData.rpStockNumber;
      } else {
        // Generate a default stock number
        testDealData.stockNumber = `RP${Date.now()}`;
      }
    }
    
    console.log('\n✅ Transformed deal data:', JSON.stringify(testDealData, null, 2));
    
    // Test creating the SalesDeal
    console.log('\n📝 Creating SalesDeal...');
    const deal = new SalesDeal(testDealData);
    await deal.save();
    
    console.log('✅ SalesDeal created successfully!');
    console.log('📊 Deal ID:', deal._id);
    console.log('📊 Customer Name:', deal.customer.name);
    console.log('📊 Stock Number:', deal.stockNumber);
    console.log('📊 VIN:', deal.vin);
    
    // Clean up - delete the test deal
    await SalesDeal.findByIdAndDelete(deal._id);
    console.log('🧹 Test deal cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    if (error.name === 'ValidationError') {
      console.error('Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testWholesaleD2DBuyDeal(); 