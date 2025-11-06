const { check } = require('express-validator');
const { validatorMiddleware } = require('../../middlewares/validatorMiddleware');

exports.addToCartValidator = [
  check('productId')
    .isMongoId()
    .withMessage('Invalid Product id format'),
    
  check('color')
    .optional()
    .isString()
    .withMessage('Color must be a string'),
    
  check('count')
    .optional()
    .isInt({ min: 1, max: 999 })
    .withMessage('Count must be a positive integer between 1 and 999'),

  validatorMiddleware,
];

exports.updateCartItemValidator = [
  check('itemId')
    .isMongoId()
    .withMessage('Invalid Cart item id format'),
    
  check('count')
    .isInt({ min: 1, max: 999 })
    .withMessage('Count must be a positive integer between 1 and 999'),

  validatorMiddleware,
];