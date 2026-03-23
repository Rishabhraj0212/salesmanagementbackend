const cron = require('node-cron');
const Product = require('../models/Product');

const startStockCron = () => {
  // Run every 30 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Checking product stock levels...');
    try {
      // Update out of stock
      await Product.updateMany(
        { quantity: 0, status: { $ne: 'Out of Stock' } },
        { $set: { status: 'Out of Stock' } }
      );

      // Update low stock
      const lowStockProducts = await Product.find({
        quantity: { $gt: 0 },
        $expr: { $lte: ['$quantity', '$thresholdValue'] }
      });
      for (const product of lowStockProducts) {
        if (product.status !== 'Low Stock') {
          product.status = 'Low Stock';
          await product.save();
        }
      }

      // Update in stock
      const inStockProducts = await Product.find({
        $expr: { $gt: ['$quantity', '$thresholdValue'] }
      });
      for (const product of inStockProducts) {
        if (product.status !== 'In Stock') {
          product.status = 'In Stock';
          await product.save();
        }
      }

      console.log('[CRON] Stock check completed');
    } catch (error) {
      console.error('[CRON] Error:', error.message);
    }
  });
  console.log('[CRON] Stock monitoring cron job started (every 5 mins)');
};

module.exports = startStockCron;
