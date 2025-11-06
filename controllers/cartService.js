const asyncHandler = require('express-async-handler');

const ApiError = require('../utils/apiError').default;
const Product = require('../models/productModel');
const Cart = require('../models/cartModel');
const Coupon = require('../models/couponModel');

const calcTotalCartPrice = async (cart) => {
  let totalPrice = 0;
  cart.products.forEach((prod) => {
    totalPrice += prod.price * prod.count;
  });

  cart.totalCartPrice = totalPrice;
  cart.totalAfterDiscount = undefined;
  cart.coupon = undefined;

  await cart.save();

  return totalPrice;
};

// @desc      Add product to cart
// @route     POST /api/v1/cart
// @access    Private/User
exports.addProductToCart = asyncHandler(async (req, res, next) => {
  const { productId, color, count = 1 } = req.body; // Default count to 1 if not provided

  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: `Product not found with id: ${productId}`
    });
  }

  // Validate requested quantity
  if (count <= 0) {
    const errorMsg = `Invalid quantity: ${count}. Quantity must be greater than 0`;
    console.log(`[CART ERROR] ${errorMsg}`);
    return res.status(400).json({
      status: 'error',
      message: errorMsg
    });
  }

  // 1) Check if there is cart for logged user
  let cart = await Cart.findOne({ cartOwner: req.user._id });

  if (cart) {
    // 2) check if product exists for user cart
    const itemIndex = cart.products.findIndex(
      (p) =>
        p.product.toString() === req.body.productId &&
        p.color === req.body.color
    );
    if (itemIndex > -1) {
      //product exists in the cart, update the quantity
      const productItem = cart.products[itemIndex];
      const newCount = productItem.count + count; // Add requested quantity
      
      // Check if new quantity exceeds available stock
      if (newCount > product.quantity) {
        const errorMsg = `Insufficient stock for ${product.title}. Available: ${product.quantity}, Current in cart: ${productItem.count}, Requested to add: ${count}, Total would be: ${newCount}`;
        console.log(`[STOCK ERROR] ${errorMsg}`);
        return res.status(400).json({
          product: product,
          count:count,
          status: 'error',
          message: errorMsg
        });
      }
      
      productItem.count = newCount;
      cart.products[itemIndex] = productItem;
    } else {
      // Check if available stock is sufficient for new item with requested quantity
      if (product.quantity < count) {
        const errorMsg = `Insufficient stock for ${product.title}. Available: ${product.quantity}, Requested: ${count}`;
        console.log(`[STOCK ERROR] ${errorMsg}`);
        return res.status(400).json({
          product:product,
          count:count,
          status: 'error',
          message: errorMsg
        });
      }
      
      //product does not exists in cart, add new item with requested quantity
      cart.products.push({ 
        product: productId, 
        color, 
        price: product.price, 
        count: count 
      });
    }
    // cart = await cart.save();
    // return res.status(201).send(cart);
  }
  if (!cart) {
    // Check if available stock is sufficient for new cart with requested quantity
    if (product.quantity < count) {
      const errorMsg = `Insufficient stock for ${product.title}. Available: ${product.quantity}, Requested: ${count}`;
      console.log(`[STOCK ERROR] ${errorMsg}`);
      return res.status(400).json({
          product: product,
          count:count,
        status: 'error',
        message: errorMsg
      });
    }
    
    //no cart for user, create new cart with requested quantity
    cart = await Cart.create({
      cartOwner: req.user._id,
      products: [{ 
        product: productId, 
        color, 
        price: product.price, 
        count: count 
      }],
    });
  }
  // let totalPrice = 0;
  // cart.products.forEach((prod) => {
  //   totalPrice += prod.price * prod.count;
  // });

  // cart.totalCartPrice = totalPrice;
  // await cart.save();

  // Calculate total cart price
  await calcTotalCartPrice(cart);

  return res.status(200).json({
    status: 'success',
    message: `${count} ${count > 1 ? 'items' : 'item'} of ${product.title} added successfully to your cart`,
    numOfCartItems: cart.products.length,
    data: cart,
  });
});

// @desc      Update product quantity
// @route     Put /api/v1/cart/:itemId
// @access    Private/User
exports.updateCartProductCount = asyncHandler(async (req, res, next) => {
  const { itemId } = req.params;
  const { count } = req.body;
  // 1) Check if there is cart for logged user
  const cart = await Cart.findOne({ cartOwner: req.user._id })
    .populate({
      path: 'products.product',
      select: 'title imageCover ratingsAverage brand category ',
      populate: { path: 'brand', select: 'name -_id', model: 'Brand' },
    })
    .populate({
      path: 'products.product',
      select: 'title imageCover ratingsAverage brand category',
      populate: { path: 'category', select: 'name -_id', model: 'Category' },
    });
  if (!cart) {
    return res.status(404).json({
      status: 'error',
      message: `No cart exist for this user: ${req.user._id}`
    });
  }

  const itemIndex = cart.products.findIndex(
    (item) => item._id.toString() === itemId
  );

  if (itemIndex > -1) {
    //product exists in the cart, update the quantity
    const productItem = cart.products[itemIndex];
    const product = productItem.product; // This is populated with full product data
    
    // Check if requested count exceeds available stock
    if (count > product.quantity) {
      return res.status(400).json({
          product: product.title,
        status: 'error',
        message: `Insufficient stock for ${product.title}. Available: ${product.quantity}, Requested: ${count}`
      });
    }
    
    // Check for valid count (must be positive)
    if (count <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Product quantity must be greater than 0'
      });
    }
    
    productItem.count = count;
    cart.products[itemIndex] = productItem;
  } else {
    return res.status(400).json({
      status: 'error',
      message: `No Product Cart item found for this id: ${itemId}`
    });
  }
  // Calculate total cart price
  await calcTotalCartPrice(cart);

  return res.status(200).json({
    status: 'success',
    numOfCartItems: cart.products.length,
    data: cart,
  });
});

// @desc      Get logged user cart
// @route     GET /api/v1/cart
// @access    Private/User
exports.getLoggedUserCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ cartOwner: req.user._id })
    .populate({
      path: 'products.product',
      select: 'title imageCover ratingsAverage brand category ',
      populate: { path: 'brand', select: 'name -_id', model: 'Brand' },
    })
    .populate({
      path: 'products.product',
      select: 'title imageCover ratingsAverage brand category',
      populate: { path: 'category', select: 'name -_id', model: 'Category' },
    });

  if (!cart) {
    return res.status(404).json({
      status: 'error',
      message: `No cart exist for this user: ${req.user._id}`
    });
  }
  return res.status(200).json({
    status: 'success',
    numOfCartItems: cart.products.length,
    data: cart,
  });
});

// @desc      Remove product from cart
// @route     DELETE /api/v1/cart/:itemId
// @access    Private/User
exports.removeCartProduct = asyncHandler(async (req, res, next) => {
  const { itemId } = req.params;
  const cart = await Cart.findOneAndUpdate(
    { cartOwner: req.user._id },
    {
      $pull: { products: { _id: itemId } },
    },
    { new: true }
  )
    .populate({
      path: 'products.product',
      select: 'title imageCover ratingsAverage brand category ',
      populate: { path: 'brand', select: 'name -_id', model: 'Brand' },
    })
    .populate({
      path: 'products.product',
      select: 'title imageCover ratingsAverage brand category',
      populate: { path: 'category', select: 'name -_id', model: 'Category' },
    });

  // Calculate total cart price
  await calcTotalCartPrice(cart);

  return res.status(200).json({
    status: 'success',
    numOfCartItems: cart.products.length,
    data: cart,
  });
});

// @desc      Clear logged user cart
// @route     DELETE /api/v1/cart
// @access    Private/User
exports.clearLoggedUserCart = asyncHandler(async (req, res, next) => {
  await Cart.findOneAndDelete({ cartOwner: req.user._id });

  res.status(204).send();
});

// @desc      Apply coupon logged user cart
// @route     PUT /api/v1/cart/applyCoupon
// @access    Private/User
exports.applyCouponToCart = asyncHandler(async (req, res, next) => {
  const { couponName } = req.body;
  console.log(couponName);

  // 2) Get current user cart
  const cart = await Cart.findOne({ cartOwner: req.user._id })
    .populate({
      path: 'products.product',
      select: 'title imageCover ratingsAverage brand category ',
      populate: { path: 'brand', select: 'name -_id', model: 'Brand' },
    })
    .populate({
      path: 'products.product',
      select: 'title imageCover ratingsAverage brand category',
      populate: { path: 'category', select: 'name -_id', model: 'Category' },
    });

  // 1) Get coupon based on it's unique name and expire > date.now
  const coupon = await Coupon.findOne({
    name: couponName,
    expire: { $gt: Date.now() },
  });
  if (!coupon) {
    cart.totalAfterDiscount = undefined;
    cart.coupon = undefined;
    await cart.save();
    return res.status(400).json({
      status: 'error',
      message: 'Coupon is invalid or has expired'
    });
  }

  const totalPrice = await calcTotalCartPrice(cart);

  const totalAfterDiscount = (
    totalPrice -
    (totalPrice * coupon.discount) / 100
  ).toFixed(2); // 99.99

  cart.totalAfterDiscount = totalAfterDiscount;
  cart.coupon = coupon.name;

  await cart.save();

  return res.status(200).json({
    status: 'success',
    numOfCartItems: cart.products.length,
    coupon: coupon.name,
    data: cart,
  });
});

// update cartItem quantity
