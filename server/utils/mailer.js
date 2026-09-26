import nodemailer from 'nodemailer';
import config from '../config/env.js';

// In tests, emails are collected here instead of being sent
export const sentMails = [];

const transporter = config.isSmtpConfigured
  ? nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  })
  : null;

export const sendMail = async ({ to, subject, text }) => {
  if (config.NODE_ENV === 'test') {
    sentMails.push({ to, subject, text });
    return;
  }

  if (!transporter) {
    console.log(`📧 [dev mail] To: ${to} | ${subject}\n${text}`);
    return;
  }

  try {
    await transporter.sendMail({ from: config.MAIL_FROM, to, subject, text });
  } catch (error) {
    if (config.NODE_ENV === 'production') throw error;
    // In development a broken SMTP setup should not block the flow
    console.warn(`⚠️  Could not send email (${error.message}). Content was:\n${text}`);
  }
};
