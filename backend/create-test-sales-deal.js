const mongoose = require('mongoose');
const SalesDeal = require('./models/SalesDeal');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createTestSalesDeal() {
  try {
    console.log('🔍 Creating Test Sales Deal...');
    
    // Create a test sales deal
    const testSalesDeal = new SalesDeal({
      vin: '1HGBH41JXMN109186',
      stockNumber: 'TEST001',
      vehicle: '2020 Honda Civic Blue',
      year: 2020,
      make: 'Honda',
      model: 'Civic',
      dealType: 'wholesale',
      currentStage: 'contract-received',
      customer: {
        name: 'Test Customer',
        type: 'individual',
        contact: {
          email: 'test@example.com',
          phone: '(555) 123-4567',
          address: '123 Test St, Test City, TS 12345',
          preferredContact: 'email'
        },
        notes: 'Test customer for sales deal',
        source: 'website'
      },
      financial: {
        purchasePrice: 15000,
        listPrice: 18000,
        expectedMargin: 3000,
        commission: {
          rate: 5,
          estimatedAmount: 900
        }
      },
      timeline: {
        purchaseDate: new Date(),
        estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      salesPerson: {
        id: '6872bc7baf3b59356684c270', // parker@rpexotics.com
        name: 'Parker',
        email: 'parker@rpexotics.com',
        phone: '(555) 987-6543'
      },
      stageHistory: [
        {
          stage: 'contract-received',
          enteredAt: new Date(),
          notes: 'Initial stage'
        }
      ],
      priority: 'medium',
      status: 'active',
      metrics: {
        daysInCurrentStage: 0,
        totalDaysInProcess: 0,
        communicationCount: 0
      }
    });
    
    const savedDeal = await testSalesDeal.save();
    console.log('✅ Test sales deal created successfully!');
    console.log(`📋 Deal ID: ${savedDeal._id}`);
    console.log(`📋 VIN: ${savedDeal.vin}`);
    console.log(`📋 Stock Number: ${savedDeal.stockNumber}`);
    console.log(`📋 Vehicle: ${savedDeal.vehicle}`);
    console.log(`📋 Deal Type: ${savedDeal.dealType}`);
    console.log(`📋 Current Stage: ${savedDeal.currentStage}`);
    console.log(`📋 Sales Person: ${savedDeal.salesPerson.name} (${savedDeal.salesPerson.email})`);
    
    // Verify it was saved
    const count = await SalesDeal.countDocuments({});
    console.log(`📊 Total sales deals in database: ${count}`);
    
  } catch (error) {
    console.error('❌ Error creating test sales deal:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestSalesDeal(); 