const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const dealers = await db.collection('dealers').aggregate([
    { $group: {
        _id: { name: { $toLower: '$name' } },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        names: { $push: '$name' }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  let totalRemoved = 0;
  for (const d of dealers) {
    // Keep the first, remove the rest
    const toRemove = d.ids.slice(1);
    if (toRemove.length > 0) {
      await db.collection('dealers').deleteMany({ _id: { $in: toRemove } });
      totalRemoved += toRemove.length;
      console.log(`Removed ${toRemove.length} duplicates for dealer name: ${d.names[0]}`);
    }
  }
  console.log(`✅ Removed ${totalRemoved} direct duplicate dealers by name.`);
  await client.close();
})(); 