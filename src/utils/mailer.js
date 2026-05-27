// =============================================
// src/utils/mailer.js — Email Notification System
// =============================================
//
// PHASE 6 PREVIEW — Full implementation comes later
// Stub for now so imports don't break server startup
// =============================================

const nodemailer = require('nodemailer');

// Create the transporter (connection to email server)
// Will be fully configured in Phase 6
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Stub: Send match notification email
const sendMatchNotification = async (to, lostItem, foundItem) => {
  console.log(`📧 [STUB] Would email ${to} about a match for: ${lostItem.title}`);
  // Full implementation in Phase 6
};

// Stub: Send welcome email
const sendWelcomeEmail = async (to, name) => {
  console.log(`📧 [STUB] Would send welcome email to ${name} at ${to}`);
  // Full implementation in Phase 6
};

module.exports = { sendMatchNotification, sendWelcomeEmail, createTransporter };
