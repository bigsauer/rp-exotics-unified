const DocumentGenerator = require('./services/documentGenerator');

async function testDocumentPerformance() {
  console.log('🚀 Testing Document Generation Performance Improvements');
  console.log('=' .repeat(60));
  
  const docGenerator = new DocumentGenerator();
  
  // Sample deal data for testing
  const sampleDealData = {
    dealType: 'wholesale-d2d',
    dealType2SubType: 'sale',
    stockNumber: 'TEST-001',
    year: 2023,
    make: 'BMW',
    model: 'X5',
    vin: '5UXCR6C56PLL12345',
    purchasePrice: 75000,
    seller: {
      name: 'Test Dealer',
      type: 'dealer',
      contact: {
        address: '123 Test St, Test City, TX 12345',
        phone: '555-123-4567',
        email: 'test@dealer.com'
      }
    },
    buyer: {
      name: 'RP Exotics',
      type: 'dealer',
      contact: {
        address: '1155 N Warson Rd, Saint Louis, MO 63132',
        phone: '(314) 970-2427',
        email: 'titling@rpexotics.com'
      }
    }
  };
  
  const sampleUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
  };
  
  console.log('\n📊 Testing Individual Document Generation:');
  console.log('-'.repeat(40));
  
  // Test individual document generation
  const startTime = Date.now();
  
  try {
    const result = await docGenerator.generateWholesaleBOS(sampleDealData, sampleUser);
    const endTime = Date.now();
    const generationTime = endTime - startTime;
    
    console.log(`✅ Document generated successfully in ${generationTime}ms`);
    console.log(`📄 Document: ${result.fileName}`);
    console.log(`📊 Size: ${result.fileSize} bytes`);
    console.log(`⏱️ Generation time: ${result.generationTime}ms`);
    
  } catch (error) {
    console.error('❌ Document generation failed:', error.message);
  }
  
  console.log('\n📊 Testing Parallel Document Generation:');
  console.log('-'.repeat(40));
  
  // Test parallel document generation
  const parallelStartTime = Date.now();
  
  try {
    const documentTasks = [
      () => docGenerator.generateWholesaleBOS(sampleDealData, sampleUser),
      () => docGenerator.generateWholesaleBOS({ ...sampleDealData, stockNumber: 'TEST-002' }, sampleUser),
      () => docGenerator.generateWholesaleBOS({ ...sampleDealData, stockNumber: 'TEST-003' }, sampleUser)
    ];
    
    const results = await docGenerator.generateDocumentsParallel(documentTasks);
    const parallelEndTime = Date.now();
    const totalTime = parallelEndTime - parallelStartTime;
    
    console.log(`✅ Parallel generation completed in ${totalTime}ms`);
    console.log(`📄 Generated ${results.length} documents`);
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.fileName} (${result.generationTime}ms)`);
    });
    
  } catch (error) {
    console.error('❌ Parallel document generation failed:', error.message);
  }
  
  console.log('\n📊 Performance Metrics Summary:');
  console.log('-'.repeat(40));
  docGenerator.logPerformanceMetrics();
  
  console.log('\n🎉 Performance test completed!');
  console.log('\n💡 Performance Improvements Implemented:');
  console.log('• Browser pooling (reuse browsers instead of creating new ones)');
  console.log('• Template caching (cache HTML templates)');
  console.log('• Parallel document generation (generate multiple docs simultaneously)');
  console.log('• Optimized Puppeteer configuration (faster browser startup)');
  console.log('• Performance monitoring (track generation times and metrics)');
  
  // Clean up
  process.exit(0);
}

// Run the test
testDocumentPerformance().catch(console.error); 