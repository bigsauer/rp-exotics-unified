const axios = require('axios');

// Dealer data with proper email information
const dealersWithEmails = [
  {
    "name": "Anthony Rumeo",
    "company": "McLaren NJ / Suburban Exotics",
    "email": "Anthony@squadrav.com",
    "phone": "",
    "location": "New Jersey"
  },
  {
    "name": "Eric Currion",
    "company": "West Coast Exotics",
    "email": "eric@westcoastexotics.com",
    "phone": "",
    "location": "West Coast"
  },
  {
    "name": "Joe Humphrey",
    "company": "Left Lane Exotics",
    "email": "joe@leftlaneexotics.com",
    "phone": "",
    "location": ""
  },
  {
    "name": "Abdulla Abunasrah",
    "company": "GMTV",
    "email": "abdulla.abunasrah@givemethevin.com",
    "phone": "(800) 249-1095",
    "location": ""
  },
  {
    "name": "Trajan Burton",
    "company": "GMTV",
    "email": "trajan@givemethevin.com",
    "phone": "",
    "location": ""
  },
  {
    "name": "Chad Cunningham",
    "company": "Dupont Registry",
    "email": "chad@dupontregistry.com",
    "phone": "",
    "location": ""
  },
  {
    "name": "Victor Falcon",
    "company": "Tampa Auto Gallery",
    "email": "victor@tampaautogallery.com",
    "phone": "",
    "location": "Tampa, FL"
  },
  {
    "name": "Eric Elbaz",
    "company": "Falcon Motor Group",
    "email": "eric@falconmotorgroup.com",
    "phone": "",
    "location": ""
  },
  {
    "name": "Aaron Payne",
    "company": "Auffenberg Ford",
    "email": "aaron@auffenbergford.com",
    "phone": "",
    "location": ""
  },
  {
    "name": "Tristen Bergen",
    "company": "AutoPark Dallas",
    "email": "tristan@autoparkdallas.com",
    "phone": "(972) 639-7707",
    "location": "Dallas, TX"
  },
  {
    "name": "Jay Rampuria",
    "company": "P1 Motorwerks",
    "email": "jay@p1motorwerks.com",
    "phone": "",
    "location": ""
  },
  {
    "name": "Brian Wallin",
    "company": "Velocity Motorcars",
    "email": "brian@velocitymotorcars.com",
    "phone": "",
    "location": ""
  },
  {
    "name": "Houston Crosta",
    "company": "Vegas Auto Collection",
    "email": "houston@vegasautocollection.com",
    "phone": "",
    "location": "Las Vegas, NV"
  },
  {
    "name": "Adam Elazeh",
    "company": "Brooklyn Auto Sales",
    "email": "Brooklynautosales2@gmail.com",
    "phone": "(718) 825-4678",
    "location": "Brooklyn, NY"
  }
];

// Configuration
const BASE_URL = 'http://localhost:5001/api';

async function getAllDealers() {
  try {
    const response = await axios.get(`${BASE_URL}/dealers`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching dealers:', error.message);
    return [];
  }
}

async function updateDealerContact(dealerId, contactData) {
  try {
    const response = await axios.put(`${BASE_URL}/dealers/${dealerId}`, {
      contact: contactData
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to update dealer contact: ${error.response?.data?.error || error.message}`);
  }
}

async function fixDealerEmails() {
  console.log('🔧 Starting dealer email fix process...');
  
  try {
    // Get all existing dealers
    const existingDealers = await getAllDealers();
    console.log(`📊 Found ${existingDealers.length} existing dealers`);
    
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const dealer of existingDealers) {
      if (!dealer.id) {
        console.log(`⚠️  Skipping dealer with missing id: ${dealer.name || dealer.company}`);
        continue;
      }
      try {
        // Find matching dealer data
        const matchingDealer = dealersWithEmails.find(d => 
          d.company.toLowerCase() === dealer.company?.toLowerCase() ||
          d.name.toLowerCase() === dealer.name?.toLowerCase()
        );
        
        if (matchingDealer) {
          console.log(`📝 Processing: ${dealer.name || dealer.company}`);
          
          // Check if contact info needs updating
          const currentContact = dealer.contact || {};
          const needsUpdate = 
            (!currentContact.email && matchingDealer.email) ||
            (!currentContact.phone && matchingDealer.phone) ||
            (!currentContact.location && matchingDealer.location);
          
          if (needsUpdate) {
            const contactData = {
              email: matchingDealer.email || currentContact.email || '',
              phone: matchingDealer.phone || currentContact.phone || '',
              location: matchingDealer.location || currentContact.location || '',
              address: currentContact.address || ''
            };
            
            await updateDealerContact(dealer.id, contactData);
            console.log(`✅ Updated contact for: ${dealer.name || dealer.company}`);
            console.log(`   Email: ${contactData.email}`);
            console.log(`   Phone: ${contactData.phone}`);
            updatedCount++;
          } else {
            console.log(`ℹ️  No update needed: ${dealer.name || dealer.company}`);
          }
        } else {
          console.log(`⚠️  No matching data found for: ${dealer.name || dealer.company}`);
        }
        
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message;
        console.log(`❌ Error updating ${dealer.name || dealer.company}: ${errorMessage}`);
        errors.push({
          dealer: dealer.name || dealer.company,
          error: errorMessage
        });
        errorCount++;
      }
    }
    
    console.log('');
    console.log('📊 Fix Summary:');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('');
      console.log('❌ Error Details:');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.dealer}: ${err.error}`);
      });
    }
    
    console.log('');
    console.log('🎉 Dealer email fix process completed!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

// Run the fix
fixDealerEmails().catch(console.error); 