// Script to add initial sales users
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rp-exotics';

async function addUsers() {
  await mongoose.connect(MONGODB_URI);

  const users = [
    {
      firstName: 'Clayton',
      lastName: 'Guzdial',
      email: 'Clayton@rpexotics.com',
      password: '123123',
      role: 'admin', // Changed from 'sales' to 'admin' for IT page access
      isActive: true
    },
    {
      firstName: 'Hayden',
      lastName: 'Long',
      email: 'Hayden@rpexotics.com',
      password: 'HDZ3204r!?',
      role: 'sales',
      isActive: true
    },
    {
      firstName: 'Brennan',
      lastName: 'Sauer',
      email: 'brennan@rpexotics.com',
      password: '123123',
      role: 'admin',
      isActive: true
    }
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const existing = await User.findOne({ email: user.email });
    if (existing) {
      console.log(`User already exists: ${user.email}`);
      continue;
    }
    await User.create({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      passwordHash,
      role: user.role,
      isActive: user.isActive,
      profile: { firstName: user.firstName, lastName: user.lastName }
    });
    console.log(`Added user: ${user.email}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

addUsers().catch(e => { console.error(e); process.exit(1); }); 