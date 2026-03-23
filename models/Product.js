const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productImage: { type: String, default: '' },
  productName: { type: String, required: true, trim: true },
  productId: { type: String, required: true, unique: true, trim: true },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, enum: ['kg', 'pcs', 'litre', 'meter', 'box', 'pack'] },
  expiryDate: { type: Date, default: null },
  thresholdValue: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['In Stock', 'Low Stock', 'Out of Stock'], default: 'In Stock' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

productSchema.pre('save', function () {
  if (this.quantity === 0) {
    this.status = 'Out of Stock';
  } else if (this.quantity <= this.thresholdValue) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
});

module.exports = mongoose.model('Product', productSchema);
