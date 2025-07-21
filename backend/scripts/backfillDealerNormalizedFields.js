// backfillDealerNormalizedFields.js
const mongoose = require('mongoose');
const Dealer = require('../models/Dealer');

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}
function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

async function backfill() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name');
  const dealers = await Dealer.find({});
  let updated = 0;
  for (const dealer of dealers) {
    let changed = false;
    // Backfill normalizedName
    const normName = normalizeName(dealer.name);
    if (dealer.normalizedName !== normName) {
      dealer.normalizedName = normName;
      changed = true;
    }
    // Backfill contact.normalizedEmail
    if (dealer.contact) {
      const normEmail = normalizeEmail(dealer.contact.email);
      if (dealer.contact.normalizedEmail !== normEmail) {
        dealer.contact.normalizedEmail = normEmail;
        changed = true;
      }
      // Backfill contact.normalizedPhone
      const normPhone = normalizePhone(dealer.contact.phone);
      if (dealer.contact.normalizedPhone !== normPhone) {
        dealer.contact.normalizedPhone = normPhone;
        changed = true;
      }
    }
    if (changed) {
      await dealer.save();
      updated++;
      console.log(`[BACKFILL] Updated dealer: ${dealer.name}`);
    }
  }
  console.log(`[BACKFILL] Done. Updated ${updated} dealers.`);
  await mongoose.disconnect();
}

backfill().catch(err => {
  console.error('[BACKFILL] Error:', err);
  process.exit(1);
}); 