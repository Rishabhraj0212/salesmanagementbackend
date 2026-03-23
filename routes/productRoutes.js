const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

// Image upload config
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const imageUpload = multer({ storage: imageStorage, fileFilter: (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  cb(null, ext && mime);
}});

// CSV upload config
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `csv-${Date.now()}.csv`)
});
const csvUpload = multer({ storage: csvStorage });

router.use(authMiddleware);

router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);
router.post('/', imageUpload.single('productImage'), productController.createProduct);
router.put('/:id', imageUpload.single('productImage'), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.post('/csv', csvUpload.single('csvFile'), productController.csvUpload);
router.post('/:id/buy', productController.buyProduct);

module.exports = router;
