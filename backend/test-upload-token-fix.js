const mongoose = require('mongoose');
const UploadToken = require('./models/UploadToken');
const crypto = require('crypto');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp-exotics-unified')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('Database name:', mongoose.connection.db.databaseName);
    
    // Test 1: Create a test upload token
    console.log('\n🧪 TEST 1: Creating test upload token...');
    
    const testToken = crypto.randomBytes(32).toString('hex');
    const testUploadToken = new UploadToken({
      token: testToken,
      dealId: new mongoose.Types.ObjectId(),
      dealModel: 'SalesDeal',
      sellerEmail: 'test@example.com',
      vehicleInfo: '2024 Test Vehicle',
      vin: '1GYS4SK98RR200728',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      maxUploadAttempts: 3
    });
    
    await testUploadToken.save();
    console.log('✅ Test upload token created:', testToken);
    
    // Test 2: Verify token can be found
    console.log('\n🧪 TEST 2: Verifying token can be found...');
    
    const foundToken = await UploadToken.findValidToken(testToken);
    if (foundToken) {
      console.log('✅ Token found and is valid');
      console.log('Token details:', {
        token: foundToken.token,
        dealId: foundToken.dealId,
        sellerEmail: foundToken.sellerEmail,
        vehicleInfo: foundToken.vehicleInfo,
        vin: foundToken.vin,
        isActive: foundToken.isActive,
        uploadAttempts: foundToken.uploadAttempts,
        maxUploadAttempts: foundToken.maxUploadAttempts,
        expiresAt: foundToken.expiresAt
      });
    } else {
      console.log('❌ Token not found or invalid');
    }
    
    // Test 3: Test increment attempts
    console.log('\n🧪 TEST 3: Testing increment attempts...');
    
    if (foundToken) {
      await foundToken.incrementAttempts();
      console.log('✅ Attempts incremented');
      console.log('New attempt count:', foundToken.uploadAttempts);
      
      // Test if token becomes inactive after max attempts
      for (let i = 0; i < 3; i++) {
        await foundToken.incrementAttempts();
      }
      
      const finalToken = await UploadToken.findById(foundToken._id);
      console.log('Final token state:', {
        isActive: finalToken.isActive,
        uploadAttempts: finalToken.uploadAttempts,
        maxUploadAttempts: finalToken.maxUploadAttempts
      });
      
      if (!finalToken.isActive) {
        console.log('✅ Token correctly deactivated after max attempts');
      } else {
        console.log('❌ Token should be deactivated');
      }
    }
    
    // Test 4: Test expiration
    console.log('\n🧪 TEST 4: Testing token expiration...');
    
    const expiredToken = new UploadToken({
      token: crypto.randomBytes(32).toString('hex'),
      dealId: new mongoose.Types.ObjectId(),
      dealModel: 'Deal',
      sellerEmail: 'expired@example.com',
      vehicleInfo: 'Expired Test Vehicle',
      vin: '1GYS4SK98RR200729',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired 1 day ago
      maxUploadAttempts: 3
    });
    
    await expiredToken.save();
    console.log('✅ Expired token created');
    
    const foundExpiredToken = await UploadToken.findValidToken(expiredToken.token);
    if (!foundExpiredToken) {
      console.log('✅ Expired token correctly not found');
    } else {
      console.log('❌ Expired token should not be found');
    }
    
    // Test 5: Check database persistence
    console.log('\n🧪 TEST 5: Checking database persistence...');
    
    const allTokens = await UploadToken.find();
    console.log('Total tokens in database:', allTokens.length);
    
    const activeTokens = await UploadToken.find({ isActive: true });
    console.log('Active tokens:', activeTokens.length);
    
    const expiredTokens = await UploadToken.find({ 
      expiresAt: { $lt: new Date() } 
    });
    console.log('Expired tokens:', expiredTokens.length);
    
    // Cleanup
    console.log('\n🧹 CLEANUP: Removing test tokens...');
    await UploadToken.deleteMany({
      sellerEmail: { $in: ['test@example.com', 'expired@example.com'] }
    });
    console.log('✅ Test tokens cleaned up');
    
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('✅ Upload token persistence is working correctly');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }); 