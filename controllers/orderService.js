const asyncHandler = require('express-async-handler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const ApiError = require('../utils/apiError');
const factory = require('./handlersFactory');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const sendEmail = require('../utils/sendEmail'); // Production email service

// @desc    Create new order
// @route   POST /api/orders/cartId
// @access  Private/Protected/User
exports.createCashOrder = asyncHandler(async (req, res, next) => {
  // app settings
  const taxPrice = 0;
  const shippingPrice = 0;

  console.log(req.params.cartId);
  // 1) Get logged user cart
  const cart = await Cart.findById(req.params.cartId);
  if (!cart) {
    return res.status(404).json({
      status: 'error',
      message: `There is no cart for this user :${req.user._id}`
    });
  }

  // 2) Check if there is coupon apply
  const cartPrice = cart.totalAfterDiscount
    ? cart.totalAfterDiscount
    : cart.totalCartPrice;

  // 2.5) Check product availability before creating order
  for (const item of cart.products) {
    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: `Product ${item.product} not found`
      });
    }
    if (product.quantity < item.count) {
      return res.status(400).json({
        product: product,
        count: item.count,
        status: 'error',
        message: `Insufficient stock for ${product.title}. Available: ${product.quantity}, Requested: ${item.count}`
      });
    }
  }

  // 3) Create order with default cash option
  const order = await Order.create({
    user: req.user._id,
    cartItems: cart.products,
    shippingAddress: req.body.shippingAddress,
    totalOrderPrice: taxPrice + shippingPrice + cartPrice,
  });

  // 4) After creating order decrement product quantity, increment sold
  // Use safer approach to prevent negative stocks
  if (order) {
    for (const item of cart.products) {
      const product = await Product.findById(item.product);
      if (product) {
        const newQuantity = Math.max(0, product.quantity - item.count);
        const newSold = product.sold + item.count;
        
        await Product.findByIdAndUpdate(item.product, {
          quantity: newQuantity,
          sold: newSold
        });
        
        // Log if stock becomes 0
        if (newQuantity === 0) {
          console.log(`⚠️  Product "${product.title}" is now out of stock`);
        }
      }
    }

    // 5) Clear cart
    await Cart.findByIdAndDelete(req.params.cartId);
    // 6) Send order details to admin email so owner can contact customer
    try {
      // build products detail lines
      const productIds = order.cartItems.map((it) => it.product);
      const products = await Product.find({ _id: { $in: productIds } });
      const productsMap = {};
      products.forEach((p) => {
        productsMap[p._id] = p;
      });

      let itemsText = '';
      order.cartItems.forEach((it) => {
        const prod = productsMap[it.product] || {};
        const title = prod.title || String(it.product);
        itemsText += `- ${title} | qty: ${it.count} | price: ${it.price}\n`;
      });

      const adminMessage =
        `New order received\nOrder id: ${order.id || order._id}\nCustomer: ${req.user.name} <${req.user.email}>\nPhone: ${req.user.phone || 'N/A'}\nShipping: ${JSON.stringify(order.shippingAddress)}\nTotal: ${order.totalOrderPrice}\nPayment: ${order.paymentMethodType || 'cash'}\nItems:\n${itemsText}`;

      await sendEmail({
        email: 'babana9977@gmail.com',
        subject: `New order #${order.id || order._id}`,
        message: adminMessage,
      });
    } catch (err) {
      console.error('Failed to send admin order email:', err);
    }
  }

  res.status(201).json({ status: 'success', data: order });
});

// @desc    Get Specific order
// @route   GET /api/orders/:id
// @access  Private/Protected/User-Admin
exports.getSpecificOrder = factory.getOne(Order);

exports.filterOrdersForLoggedUser = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'user') req.filterObject = { user: req.user._id };
  next();
});

// @desc    Get my orders
// @route   GET /api/orders
// @access  Private/Protected/User-Admin
exports.getAllOrders = factory.getAll(Order);

// @desc    Update  order to  paid
// @route   PUT /api/orders/:id/pay
// @access  Private/Protected/User-Admin
exports.updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: `There is no order for this id: ${req.params.id}`
    });
  }

  order.isPaid = true;
  order.paidAt = Date.now();

  const updatedOrder = await order.save();
  res.status(200).json({
    status: 'Success',
    data: updatedOrder,
  });
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
exports.updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: `There is no order for this id: ${req.params.id}`
    });
  }

  order.isDelivered = true;
  // order.id++;
  console.log(order.id);
  
  order.deliveredAt = Date.now();

  const updatedOrder = await order.save();
  res.status(200).json({ status: 'Success', data: updatedOrder });
});

// @desc    Create order checkout session
// @route   GET /api/orders/:cartId
// @access  Private/User
exports.checkoutSession = asyncHandler(async (req, res, next) => {
  // 1) Get the currently cart
  const cart = await Cart.findById(req.params.cartId);
  if (!cart) {
    return res.status(404).json({
      status: 'error',
      message: `There is no cart for this user :${req.user._id}`
    });
  }

  // 2) Get cart price, Check if there is coupon apply
  const cartPrice = cart.totalAfterDiscount
    ? cart.totalAfterDiscount
    : cart.totalCartPrice;

  // 3) Create checkout session
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        name: req.user.name,
        amount: cartPrice * 100,
        currency: 'egp',
        quantity: 1,
      },
    ],
    mode: 'payment',
    // success_url: `${req.protocol}://${req.get('host')}/orders`,
    success_url: `http://localhost:3000/user/allorders`,
    // cancel_url: `${req.protocol}://${req.get('host')}/cart`,
    cancel_url: `http://localhost:3000/cart`,
    customer_email: req.user.email,
    client_reference_id: req.params.cartId,
    metadata: req.body.shippingAddress,
  });

  // res.redirect(303, session.url);

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

const createOrderCheckout = async (session) => {
  // 1) Get needed data from session
  const cartId = session.client_reference_id;
  const checkoutAmount = session.display_items[0].amount / 100;
  const shippingAddress = session.metadata;

  // 2) Get Cart and User
  const cart = await Cart.findById(cartId);
  const user = await User.findOne({ email: session.customer_email });

  //3) Create order
  const order = await Order.create({
    user: user._id,
    cartItems: cart.products,
    shippingAddress,
    totalOrderPrice: checkoutAmount,
    paymentMethodType: 'card',
    isPaid: true,
    paidAt: Date.now(),
  });

  // 4) After creating order decrement product quantity, increment sold
  // Use safer approach to prevent negative stocks
  if (order) {
    for (const item of cart.products) {
      const product = await Product.findById(item.product);
      if (product) {
        const newQuantity = Math.max(0, product.quantity - item.count);
        const newSold = product.sold + item.count;
        
        await Product.findByIdAndUpdate(item.product, {
          quantity: newQuantity,
          sold: newSold
        });
        
                // Log if stock becomes 0
        if (newQuantity === 0) {
          console.log(`⚠️  Product "${product.title}" is now out of stock`);
        }
      }
    }

    // 5) Clear cart
    await Cart.findByIdAndDelete(cart._id);
    // 6) Send order details to admin email so owner can contact customer (Stripe)
    try {
      const productIds = order.cartItems.map((it) => it.product);
      const products = await Product.find({ _id: { $in: productIds } });
      const productsMap = {};
      products.forEach((p) => {
        productsMap[p._id] = p;
      });

      let itemsText = '';
      order.cartItems.forEach((it) => {
        const prod = productsMap[it.product] || {};
        const title = prod.title || String(it.product);
        itemsText += `- ${title} | qty: ${it.count} | price: ${it.price}\n`;
      });

      const adminMessage =
        `New order received\nOrder id: ${order.id || order._id}\nCustomer: ${user.name} <${user.email}>\nPhone: ${user.phone || 'N/A'}\nShipping: ${JSON.stringify(order.shippingAddress)}\nTotal: ${order.totalOrderPrice}\nPayment: ${order.paymentMethodType || 'card'}\nItems:\n${itemsText}`;

      await sendEmail({
        email: 'babana9977@gmail.com',
        subject: `New order #${order.id || order._id}`,
        message: adminMessage,
      });
    } catch (err) {
      console.error('Failed to send admin order email (stripe):', err);
    }
  }
};

// @desc    This webhook will run when stipe payment successfully paid
// @route   PUT /webhook-checkout
// @access  From stripe
exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'].toString();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createOrderCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};