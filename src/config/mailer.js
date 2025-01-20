require('dotenv').config();

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
    if (error) {
      console.error('Błąd połączenia z serwerem SMTP:', error);
    } else {
      console.log('Połączenie z serwerem SMTP zostało pomyślnie nawiązane');
    }
  });

module.exports = transporter;