const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true },
  refNumber: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' },
  dueDate: { type: Date, required: true },
  customerName: { type: String, default: 'Walk-in Customer' },
  productName: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
