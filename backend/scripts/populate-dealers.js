const { MongoClient } = require('mongodb');
require('dotenv').config();

// Dealer data from the user
const dealers = [
  {
    name: "McLaren NJ / Suburban Exotics",
    contact: { person: "Anthony Rumeo", phone: "", email: "Anthony@squadrav.com" },
    location: { city: "New Jersey", state: "NJ", country: "USA" }
  },
  {
    name: "West Coast Exotics",
    contact: { person: "Eric Currion", phone: "", email: "" },
    location: { city: "Los Angeles", state: "CA", country: "USA" }
  },
  {
    name: "Left Lane Exotics",
    contact: { person: "Joe Humphrey", phone: "", email: "" },
    location: { city: "Dallas", state: "TX", country: "USA" }
  },
  {
    name: "GMTV",
    contact: { person: "Abdulla Abunasrah", phone: "8002491095", email: "abdulla.abunasrah@givemethevin.com" },
    location: { city: "Nationwide", state: "", country: "USA" }
  },
  {
    name: "GMTV",
    contact: { person: "Trajan Burton", phone: "", email: "" },
    location: { city: "Nationwide", state: "", country: "USA" }
  },
  {
    name: "Dupont Registry",
    contact: { person: "Chad Cunningham", phone: "", email: "" },
    location: { city: "St. Petersburg", state: "FL", country: "USA" }
  },
  {
    name: "Tampa Auto Gallery",
    contact: { person: "Victor Falcon", phone: "", email: "" },
    location: { city: "Tampa", state: "FL", country: "USA" }
  },
  {
    name: "Falcon Motor Group",
    contact: { person: "Eric Elbaz", phone: "", email: "" },
    location: { city: "Miami", state: "FL", country: "USA" }
  },
  {
    name: "Auffenberg Ford",
    contact: { person: "Aaron Payne", phone: "", email: "" },
    location: { city: "Belleville", state: "IL", country: "USA" }
  },
  {
    name: "AutoPark Dallas",
    contact: { person: "Tristen Bergen", phone: "972-639-7707", email: "tristan@autoparkdallas.com" },
    location: { city: "Dallas", state: "TX", country: "USA" }
  },
  {
    name: "P1 Motorwerks",
    contact: { person: "Jay Rampuria", phone: "", email: "" },
    location: { city: "Chicago", state: "IL", country: "USA" }
  },
  {
    name: "Velocity Motorcars",
    contact: { person: "Brian Wallin", phone: "", email: "" },
    location: { city: "Las Vegas", state: "NV", country: "USA" }
  },
  {
    name: "Vegas Auto Collection",
    contact: { person: "Houston Crosta", phone: "", email: "" },
    location: { city: "Las Vegas", state: "NV", country: "USA" }
  },
  {
    name: "Brooklyn Auto Sales",
    contact: { person: "Adam Elazeh", phone: "(718) 825-4678", email: "Brooklynautosales2@gmail.com" },
    location: { city: "Brooklyn", state: "NY", country: "USA" }
  },
  {
    name: "Bentley New Jersey",
    contact: { person: "Frank Gebba", phone: "", email: "" },
    location: { city: "New Jersey", state: "NJ", country: "USA" }
  },
  {
    name: "Galpin Motors",
    contact: { person: "Adam Camasta", phone: "", email: "" },
    location: { city: "Los Angeles", state: "CA", country: "USA" }
  },
  {
    name: "Recar",
    contact: { person: "Rodolfo Garza", phone: "", email: "" },
    location: { city: "Houston", state: "TX", country: "USA" }
  },
  {
    name: "Motorcars of Chicago",
    contact: { person: "Waseem Rehan", phone: "", email: "" },
    location: { city: "Chicago", state: "IL", country: "USA" }
  },
  {
    name: "JNBS Motorz",
    contact: { person: "Jared Hoyt", phone: "", email: "" },
    location: { city: "Nashville", state: "TN", country: "USA" }
  },
  {
    name: "Porsche St. Louis",
    contact: { person: "Sara Batchelor", phone: "", email: "" },
    location: { city: "St. Louis", state: "MO", country: "USA" }
  },
  {
    name: "Marshall Goldman",
    contact: { person: "Danny Baker", phone: "", email: "" },
    location: { city: "Cleveland", state: "OH", country: "USA" }
  },
  {
    name: "Tactical Fleet",
    contact: { person: "Chris Barta", phone: "", email: "" },
    location: { city: "Phoenix", state: "AZ", country: "USA" }
  },
  {
    name: "CLB Sports Cars",
    contact: { person: "Craig Becker", phone: "", email: "" },
    location: { city: "Denver", state: "CO", country: "USA" }
  },
  {
    name: "Enthusiast Auto Sales",
    contact: { person: "Alex Vaughn", phone: "", email: "" },
    location: { city: "Atlanta", state: "GA", country: "USA" }
  },
  {
    name: "J & S Autohaus",
    contact: { person: "George Saliba", phone: "", email: "" },
    location: { city: "Detroit", state: "MI", country: "USA" }
  },
  {
    name: "Avid Motorsports",
    contact: { person: "Blake McCombs", phone: "", email: "" },
    location: { city: "Charlotte", state: "NC", country: "USA" }
  },
  {
    name: "Dave Sinclair Ford",
    contact: { person: "Pinky Persons", phone: "", email: "" },
    location: { city: "St. Louis", state: "MO", country: "USA" }
  },
  {
    name: "Jim Butler Maserati",
    contact: { person: "Brett Estes", phone: "", email: "" },
    location: { city: "St. Louis", state: "MO", country: "USA" }
  },
  {
    name: "HBI Auto",
    contact: { person: "Billy Wenk", phone: "", email: "" },
    location: { city: "Milwaukee", state: "WI", country: "USA" }
  },
  {
    name: "1of1 MotorSports",
    contact: { person: "Scott Zankl", phone: "(561) 756-1933", email: "Scott@1of1motorsports.com" },
    location: { city: "West Palm Beach", state: "FL", country: "USA" }
  },
  {
    name: "1of1 MotorSports",
    contact: { person: "Tyler Zankl", phone: "561 405-0816", email: "tyler@1of1motorsports.com" },
    location: { city: "West Palm Beach", state: "FL", country: "USA" }
  },
  {
    name: "Foreign Affairs Motorsports",
    contact: { person: "Amy Farnham", phone: "561-923-5233", email: "amyv4n@gmail.com" },
    location: { city: "West Palm Beach", state: "FL", country: "USA" }
  },
  {
    name: "Republic Auto Group",
    contact: { person: "Simon M", phone: "614-286-8891", email: "Simon@republicautogroup.com" },
    location: { city: "Columbus", state: "OH", country: "USA" }
  },
  {
    name: "Ferrari Long Island",
    contact: { person: "", phone: "551-228-9864", email: "edefrancesco@ferrarili.com" },
    location: { city: "Long Island", state: "NY", country: "USA" }
  },
  {
    name: "Exotic Motorsports of OK",
    contact: { person: "Eliud Villarreal", phone: "405-664-2073", email: "eliud@exoticmotorsportsok.com" },
    location: { city: "Oklahoma City", state: "OK", country: "USA" }
  },
  {
    name: "Premier Auto Group of South Florida",
    contact: { person: "", phone: "", email: "" },
    location: { city: "South Florida", state: "FL", country: "USA" }
  },
  {
    name: "Friendly Auto Sales",
    contact: { person: "", phone: "479-899-7686", email: "qwkcollections@gmail.com" },
    location: { city: "Fayetteville", state: "AR", country: "USA" }
  },
  {
    name: "Foreign Cars Italia",
    contact: { person: "Reade", phone: "336-688-0637", email: "rfulton@foreigncarsitali.com" },
    location: { city: "Greensboro", state: "NC", country: "USA" }
  }
];

async function populateDealers() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('🚀 Connecting to MongoDB...');
    await client.connect();
    const db = client.db('rp_exotics');
    
    console.log('📝 Populating dealers collection...');
    
    // Clear existing dealers
    await db.collection('dealers').deleteMany({});
    console.log('🗑️  Cleared existing dealers');
    
    // Insert new dealers
    const dealerDocuments = dealers.map(dealer => ({
      name: dealer.name,
      type: 'exotic',
      status: 'active',
      contact: dealer.contact,
      location: dealer.location,
      metrics: {
        totalDeals: 0,
        totalPurchaseVolume: 0,
        totalSaleVolume: 0,
        lastDealDate: null
      },
      dealHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    const result = await db.collection('dealers').insertMany(dealerDocuments);
    
    console.log(`✅ Successfully inserted ${result.insertedCount} dealers`);
    console.log('📊 Dealers are now available for search in the New Deal Entry form');
    
  } catch (error) {
    console.error('❌ Error populating dealers:', error);
  } finally {
    await client.close();
  }
}

// Run the population
populateDealers().catch(console.error); 