const express = require('express');

const {
  getProduct,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  resizeProductImages,
} = require('../controllers/productController');
const {
  createProductValidator,
  getProductValidator,
  updateProductValidator,
  deleteProductValidator,
} = require('../utils/validators/productValidator');
const reviewRoute = require('./reviewRoute');

const router = express.Router();
router.use('/:id/reviews', reviewRoute);

router
  .route('/')
  .get(getProducts)
  .post(
    uploadProductImages,
    resizeProductImages,
    createProductValidator,
    createProduct
  );

// router.use(idValidation);
router
  .route('/:id')
  .get(getProductValidator, getProduct)
  .put(
    uploadProductImages,
    resizeProductImages,
    updateProductValidator,
    updateProduct
  )
  .delete(deleteProductValidator, deleteProduct);

module.exports = router;
