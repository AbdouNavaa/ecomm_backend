const nodemailer = require('nodemailer');
const ApiError = require("../utils/apiError");

// Development email service - logs to console instead of sending real emails
const sendEmailDev = async (options) => {
  if (process.env.NODE_ENV === 'development') {
    // In development, just log the email to console
    console.log('=== EMAIL WOULD BE SENT ===');
    console.log('To:', options.email);
    console.log('Subject:', options.subject);
    console.log('Message:');
    console.log(options.message);
    console.log('========================');
    return; // Don't actually send
  }

  // In production, use real email service
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    secure: true,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: 'E-shop App <ie19284.etu@iscae.mr>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new ApiError('There was an error sending the email. Try again later!', 500);
  }
};

module.exports = sendEmailDev;