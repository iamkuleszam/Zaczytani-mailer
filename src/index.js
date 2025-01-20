require('dotenv').config();
const { sendEmail } = require('./services/emailService');

const interval = 10000; // czas w milisekundach

setInterval(async () => {
  console.log(`[${new Date().toISOString()}] Rozpoczynanie sprawdzania wiadomości...`);
  try {
    await sendEmail();
  } catch (error) {
    console.error('Błąd podczas przetwarzania wiadomości:', error);
  }
}, interval);
