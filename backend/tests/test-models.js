const mongoose = require('mongoose');
require('dotenv').config();

const { Deal, Dealer, User } = require('./models');

async function testModels() {
  console.log('🧪 Testing RP Exotics Mongoose Models\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB via Mongoose');
    
    // Test User model
    console.log('\n1️⃣ Testing User model...');
    const unique = Date.now();
    const testUser = new User({
      username: `testuser${unique}`,
      name: 'Test User',
      email: `test-${unique}@example.com`,
      role: 'sales'
    });
    
    await testUser.save();
    console.log('✅ User created successfully:', testUser._id);
    
    // Test Dealer model
    console.log('\n2️⃣ Testing Dealer model...');
    const testDealer = new Dealer({
      name: `Test Dealer ${Date.now()}`,
      company: 'Test Company',
      type: 'dealer',
      contact: {
        phone: '555-1234',
        email: 'dealer@test.com',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TX',
          zip: '12345'
        }
      }
    });
    
    await testDealer.save();
    console.log('✅ Dealer created successfully:', testDealer._id);
    
    // Test Deal model
    console.log('\n3️⃣ Testing Deal model...');
    const testDeal = new Deal({
      vin: `1HGBH41JXMN${Date.now().toString().slice(-6)}`,
      year: 2023,
      make: 'Honda',
      model: 'Civic',
      mileage: 15000,
      dealType: 'retail-pp',
      fundingSource: 'cash',
      purchaseDate: new Date(),
      paymentMethod: 'check',
      seller: {
        name: 'Test Seller'
      },
      createdBy: testUser._id
    });
    
    await testDeal.save();
    console.log('✅ Deal created successfully:', testDeal._id);
    console.log('   Stock Number:', testDeal.rpStockNumber);
    
    // Test virtual field
    console.log('\n4️⃣ Testing virtual fields...');
    testDeal.financial = {
      purchasePrice: 25000,
      listPrice: 30000
    };
    await testDeal.save();
    console.log('✅ Profit calculated:', testDeal.profit);
    
    // Test text search
    console.log('\n5️⃣ Testing text search...');
    const searchResults = await Dealer.find({
      $text: { $search: 'Test' }
    });
    console.log('✅ Text search found:', searchResults.length, 'dealers');
    
    // Clean up test data
    console.log('\n6️⃣ Cleaning up test data...');
    await User.deleteOne({ _id: testUser._id });
    await Dealer.deleteOne({ _id: testDealer._id });
    await Deal.deleteOne({ _id: testDeal._id });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All model tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the tests
testModels(); 