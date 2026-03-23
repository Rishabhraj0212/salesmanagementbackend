const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', invoiceController.getInvoices);
router.get('/stats', invoiceController.getInvoiceStats);
router.get('/:id', invoiceController.getInvoiceById);
router.patch('/:id/status', invoiceController.updateInvoiceStatus);
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
