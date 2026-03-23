const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Sale = require('../models/Sale');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const query = { user: req.userId };
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { productId: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ products, total, pages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.userId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { productName, productId, category, price, quantity, unit, expiryDate, thresholdValue } = req.body;
    const existing = await Product.findOne({ productId });
    if (existing) return res.status(400).json({ message: 'Product ID already exists' });

    const productImage = req.file ? `/uploads/${req.file.filename}` : '';
    const product = new Product({
      productImage, productName, productId, category,
      price: parseFloat(price), quantity: parseInt(quantity),
      unit, expiryDate: expiryDate || null,
      thresholdValue: parseInt(thresholdValue),
      user: req.userId
    });
    await product.save();

    // Log the purchase of this inventory
    const purchase = new Sale({
      productId: product._id,
      productName: product.productName,
      quantity: product.quantity,
      type: 'purchase',
      amount: product.price * product.quantity,
      user: req.userId
    });
    await purchase.save();

    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.userId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const updates = req.body;
    if (req.file) updates.productImage = `/uploads/${req.file.filename}`;
    Object.keys(updates).forEach(key => { product[key] = updates[key]; });
    await product.save();
    res.json({ message: 'Product updated', product });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.csvUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No CSV file uploaded' });
    const results = [];
    const errors = [];
    const filePath = req.file.path;

    const stream = fs.createReadStream(filePath).pipe(csv());
    const rows = [];
    for await (const row of stream) {
      rows.push(row);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const existing = await Product.findOne({ productId: row.productId || row.product_id });
        if (existing) {
          errors.push({ row: i + 1, message: `Product ID ${row.productId || row.product_id} already exists` });
          continue;
        }
        const product = new Product({
          productName: row.productName || row.product_name || row.name,
          productId: row.productId || row.product_id || row.id,
          category: row.category,
          price: parseFloat(row.price) || 0,
          quantity: parseInt(row.quantity) || 0,
          unit: row.unit || 'pcs',
          expiryDate: row.expiryDate || row.expiry_date || null,
          thresholdValue: parseInt(row.thresholdValue || row.threshold_value || row.threshold) || 5,
          user: req.userId
        });
        await product.save();

        const purchase = new Sale({
          productId: product._id,
          productName: product.productName,
          quantity: product.quantity,
          type: 'purchase',
          amount: product.price * product.quantity,
          user: req.userId
        });
        await purchase.save();

        results.push(product);
      } catch (err) {
        errors.push({ row: i + 1, message: err.message });
      }
    }

    fs.unlinkSync(filePath);
    res.json({ message: `${results.length} products added`, added: results.length, errors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.buyProduct = async (req, res) => {
  try {
    const { quantity, customerName } = req.body;
    const product = await Product.findOne({ _id: req.params.id, user: req.userId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.quantity < quantity) {
      return res.status(400).json({ message: `Insufficient stock. Available: ${product.quantity}` });
    }

    product.quantity -= parseInt(quantity);
    await product.save();

    const amount = product.price * parseInt(quantity);

    // Create sale record
    const sale = new Sale({
      productId: product._id,
      productName: product.productName,
      quantity: parseInt(quantity),
      type: 'sale',
      amount,
      user: req.userId
    });
    await sale.save();

    // Create invoice
    const lastInvoice = await Invoice.findOne({ user: req.userId }).sort({ createdAt: -1 });
    let nextInvoiceNumber = 1;
    if (lastInvoice && lastInvoice.invoiceId) {
      const parts = lastInvoice.invoiceId.split('-');
      if (parts.length === 2) {
        nextInvoiceNumber = parseInt(parts[1]) + 1;
      }
    }
    const invoiceId = `INV-${String(nextInvoiceNumber).padStart(4, '0')}`;
    const refNumber = `REF-${Date.now().toString(36).toUpperCase()}`;

    const invoice = new Invoice({
      invoiceId,
      refNumber,
      amount,
      status: 'Unpaid',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      customerName: customerName || 'Walk-in Customer',
      productName: product.productName,
      quantity: parseInt(quantity),
      user: req.userId
    });
    await invoice.save();

    res.json({ message: 'Purchase successful', product, invoice, sale });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
