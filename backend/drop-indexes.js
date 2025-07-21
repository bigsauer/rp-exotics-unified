const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp-exotics', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function dropIndexes() {
  try {
    console.log('Connected to MongoDB');
    
    // Get the deals collection
    const dealsCollection = mongoose.connection.collection('deals');
    
    // List all indexes
    const indexes = await dealsCollection.indexes();
    console.log('Current indexes:', indexes);
    
    // Drop the rpStockNumber index if it exists
    try {
      await dealsCollection.dropIndex('rpStockNumber_1');
      console.log('✅ Dropped rpStockNumber_1 index');
    } catch (error) {
      console.log('rpStockNumber_1 index not found or already dropped');
    }
    
    // List indexes again to confirm
    const indexesAfter = await dealsCollection.indexes();
    console.log('Indexes after dropping:', indexesAfter);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

dropIndexes(); 