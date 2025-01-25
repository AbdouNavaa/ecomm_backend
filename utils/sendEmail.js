const nodemailer = require('nodemailer');
const ApiError = require("../utils/apiError");

// Path options as argument like : {email address, subject, email content and others}
const sendEmail = async (options) => {
  //  1) Create a transporter (transporter is the service that will send email like gmail, sendGrid and Mailgun)
  // note: Gmail is predefined service in nodemailer but mailTrap not predefined

  /* Activate in gmail "less secure app" option if you use email service
     note : if we use gmail we can only send 500 email per day */
     const transporter = nodemailer.createTransport({
      service: 'gmail', // You can use "gmail" directly instead of specifying host and port
      secure: true,
      host: 'smtp.gmail.com',
      port: 465,
      auth: {
        user: process.env.EMAIL_USERNAME, // Your Gmail email address
        pass: process.env.EMAIL_PASSWORD, // Your App-specific password (not your normal Gmail password)
      },
    });
    

  // 2) Define the email options
  const mailOptions = {
    from: 'E-shop App <ie19284.etu@iscae.mr>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html:
  };

  // 3) Actually send the email
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new ApiError('There was an error sending the email. Try again later!', 500);
  }
  
};

module.exports = sendEmail;
