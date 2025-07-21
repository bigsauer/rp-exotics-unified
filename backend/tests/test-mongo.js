const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://brennan:lohxiEkALjIXTv0j@rp-exotics-cluster.wtjzoiq.mongodb.net/?retryWrites=true&w=majority&appName=rp-exotics-cluster";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas!");
    const dbs = await client.db().admin().listDatabases();
    console.log("Databases:", dbs.databases.map(db => db.name));
  } catch (err) {
    console.error("❌ Connection failed:", err);
  } finally {
    await client.close();
  }
}

run(); 