const mongoose = require('mongoose');

const NewDealSchema = new mongoose.Schema({
  vin: String,
  year: String,
  make: String,
  model: String,
  mileage: String,
  exteriorColor: String,
  interiorColor: String,
  numberOfKeys: String,
  dealType: String,
  fundingSource: String,
  purchaseDate: String,
  paymentMethod: String,
  currentStage: String,
  purchasePrice: String,
  listPrice: String,
  killPrice: String,
  wholesalePrice: String,
  commissionRate: String,
  brokerageFee: String,
  brokeerageFeePaidTo: String,
  payoffBalance: String,
  amountDueToCustomer: String,
  amountDueToRP: String,
  sellerName: String,
  sellerAddress: String,
  sellerPhone: String,
  sellerEmail: String,
  rpStockNumber: String,
  vehicleDescription: String,
  generalNotes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NewDeal', NewDealSchema); 