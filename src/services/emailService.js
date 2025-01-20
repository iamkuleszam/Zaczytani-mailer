const transporter = require('../config/mailer');
const sql = require('mssql');

// Konfiguracja MSSQL
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// Funkcja do pobierania niewysłanych wiadomości z tabeli
const fetchPendingEmails = async () => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .query('SELECT Id, EmailTo, EmailTemplate, EmailContent, CurrentRetry, MaxRetries FROM EmailInfo WHERE IsSent = 0');
    return result.recordset;
  } catch (error) {
    console.error('Błąd podczas pobierania wiadomości z bazy danych:', error);
    throw error;
  }
};

// Funkcja do aktualizacji statusu wiadomości
const markEmailAsSent = async (Id) => {
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().query(`UPDATE EmailInfo SET IsSent = 1 WHERE Id = '${Id}'`);
  } catch (error) {
    console.error(`Błąd podczas aktualizacji statusu wiadomości o Id ${Id}:`, error);
    throw error;
  }
};

// Przykładowy wzór wiadomości o nowym komentarzu
const emailTemplates = {
  newComment: (variables) => ({
    subject: 'Nowy komentarz do Twojej recenzji!',
    html: `
      <h1>Nowy komentarz do Twojej recenzji "${variables[0]}"!</h1>
      <h2>Hej! Ktoś dodał nowy komentarz do Twojej recenzji książki "${variables[0]}": Zobacz odpowiedź tutaj: ${variables[1]} <h2>
    `,
  }),
};

// Funkcja do wysyłania e-maili
const sendEmail = async () => {
  const emails = await fetchPendingEmails();

  for (const email of emails) {
    console.log(`currentRetry: ${email.CurrentRetry}, max: ${email.MaxRetries}`);
    while (email.CurrentRetry < email.MaxRetries) {
      try {
        const variables = JSON.parse(email.EmailContent);

        const { subject, text, html } = emailTemplates.newComment(variables);

        await transporter.sendMail({
          from: `"Zaczytani" <${process.env.SMTP_USER}>`,
          to: email.EmailTo,
          subject,
          html,
        });
        console.log(`Wysłano e-mail do: ${email.EmailTo}`);
        await markEmailAsSent(email.Id);
        break;
      } catch (error) {
        console.error(`Nie udało się wysłać e-maila do: ${email.EmailTo}`, error);

        const pool = await sql.connect(dbConfig);
        await pool.request().query(`UPDATE EmailInfo SET CurrentRetry = '${email.CurrentRetry + 1}' WHERE Id = '${email.Id}'`);

        const result = await pool
          .request().query(`SELECT CurrentRetry FROM EmailInfo WHERE Id = '${email.Id}'`);
        email.CurrentRetry = result;
      }
    }
  }
};

module.exports = { sendEmail };
