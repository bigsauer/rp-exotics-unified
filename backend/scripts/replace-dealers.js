const { MongoClient } = require('mongodb');
require('dotenv').config();

const dealers = [
  { name: 'McLaren NJ / Suburban Exotics', contactPerson: 'Anthony Rumeo', email: 'Anthony@squadrav.com' },
  { name: 'West Coast Exotics', contactPerson: 'Eric Currion' },
  { name: 'Left Lane Exotics', contactPerson: 'Joe Humphrey' },
  { name: 'GMTV', contactPerson: 'Abdulla Abunasrah', phone: '8002491095', email: 'abdulla.abunasrah@givemethevin.com' },
  { name: 'GMTV', contactPerson: 'Trajan Burton' },
  { name: 'Dupont Registry', contactPerson: 'Chad Cunningham' },
  { name: 'Tampa Auto Gallery', contactPerson: 'Victor Falcon' },
  { name: 'Falcon Motor Group', contactPerson: 'Eric Elbaz' },
  { name: 'Auffenberg Ford', contactPerson: 'Aaron Payne' },
  { name: 'AutoPark Dallas', contactPerson: 'Tristen Bergen', phone: '972-639-7707', email: 'tristan@autoparkdallas.com' },
  { name: 'P1 Motorwerks', contactPerson: 'Jay Rampuria' },
  { name: 'Velocity Motorcars', contactPerson: 'Brian Wallin' },
  { name: 'Vegas Auto Collection', contactPerson: 'Houston Crosta' },
  { name: 'Brooklyn Auto Sales', contactPerson: 'Adam Elazeh', phone: '(718) 825-4678', email: 'Brooklynautosales2@gmail.com' },
  { name: 'Bentley New Jersey', contactPerson: 'Frank Gebba' },
  { name: 'Galpin Motors', contactPerson: 'Adam Camasta' },
  { name: 'Recar', contactPerson: 'Rodolfo Garza' },
  { name: 'Motorcars of Chicago', contactPerson: 'Waseem Rehan' },
  { name: 'JNBS Motorz', contactPerson: 'Jared Hoyt' },
  { name: 'Porsche St. Louis', contactPerson: 'Sara Batchelor' },
  { name: 'Marshall Goldman', contactPerson: 'Danny Baker' },
  { name: 'Tactical Fleet', contactPerson: 'Chris Barta' },
  { name: 'CLB Sports Cars', contactPerson: 'Craig Becker' },
  { name: 'Enthusiast Auto Sales', contactPerson: 'Alex Vaughn' },
  { name: 'J & S Autohaus', contactPerson: 'George Saliba' },
  { name: 'Avid Motorsports', contactPerson: 'Blake McCombs' },
  { name: 'Dave Sinclair Ford', contactPerson: 'Pinky Persons' },
  { name: 'Jim Butler Maserati', contactPerson: 'Brett Estes' },
  { name: 'HBI Auto', contactPerson: 'Billy Wenk' },
  { name: '1of1 MotorSports', contactPerson: 'Scott Zankl', phone: '(561) 756-1933', email: 'Scott@1of1motorsports.com' },
  { name: '1of1 MotorSports', contactPerson: 'Tyler Zankl', phone: '561 405-0816', email: 'tyler@1of1motorsports.com' },
  { name: 'Foreign Affairs Motorsports', contactPerson: 'Amy Farnham', phone: '561-923-5233', email: 'amyv4n@gmail.com' },
  { name: 'Republic Auto Group', contactPerson: 'Simon M', phone: '614-286-8891', email: 'Simon@republicautogroup.com' },
  { name: 'Ferrari Long Island', phone: '551-228-9864', email: 'edefrancesco@ferrarili.com' },
  { name: 'Exotic Motorsports of OK', contactPerson: 'Eliud Villarreal', phone: '405-664-2073', email: 'eliud@exoticmotorsportsok.com' },
  { name: 'Premier Auto Group of South Florida' },
  { name: 'Friendly Auto Sales', phone: '479-899-7686', email: 'qwkcollections@gmail.com' },
  { name: 'Foreign Cars Italia', contactPerson: 'Reade', phone: '336-688-0637', email: 'rfulton@foreigncarsitali.com' }
];

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  await db.collection('dealers').deleteMany({});
  const dealerDocs = dealers.map(d => ({
    name: d.name,
    company: d.name,
    contact: {
      person: d.contactPerson || '',
      phone: d.phone || '',
      email: d.email ? d.email.toLowerCase() : ''
    },
    isActive: true
  }));
  const result = await db.collection('dealers').insertMany(dealerDocs);
  console.log(`✅ Inserted ${result.insertedCount} dealers.`);
  dealerDocs.forEach(d => console.log(`- ${d.name}`));
  await client.close();
})(); 