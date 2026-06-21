// =============================================
// src/utils/mailer.js — Email Notification System (Phase 6)
// =============================================
//
// WHAT IS NODEMAILER?
// A Node.js library that lets you send emails programmatically.
// It speaks SMTP — the same protocol your Gmail app uses under the hood.
//
// WHAT IS SMTP?
// Simple Mail Transfer Protocol — the internet standard for sending email.
// It works like this:
//   1. Your app opens a TCP connection to Gmail's SMTP server (smtp.gmail.com:587)
//   2. It authenticates using your Gmail App Password
//   3. It hands off the email — Gmail's servers deliver it to the recipient
//   4. Connection closes
//
// WHY NOT USE THE GMAIL API INSTEAD?
// Gmail API is more powerful but requires OAuth2 setup (complex).
// SMTP with an App Password is simpler and perfect for transactional emails.
//
// WHAT IS A TRANSPORTER?
// The "connection" object. You create it once, reuse it for all emails.
// Like creating one postal account — you don't open a new account per letter.
//
// ANALOGY: Nodemailer is the mail room of your company.
// You hand it a letter (email options), it handles stamps, routing, delivery.
// =============================================

const nodemailer = require('nodemailer');

// =============================================
// CREATE THE TRANSPORTER (Gmail SMTP)
// =============================================
// This is a factory function — it creates and returns a transporter.
// We use a function (not a module-level variable) so we can:
//   - Detect missing config early and give helpful errors
//   - Create a fresh transporter without restarting the server
//
// HOW GMAIL SMTP WORKS:
//   Host: smtp.gmail.com
//   Port: 587 (STARTTLS — starts unencrypted, upgrades to TLS mid-handshake)
//   Port: 465 (SSL — encrypted from the start) — we use 587, industry standard
//   Auth: username = your Gmail, password = App Password (16 chars, no spaces)

const createTransporter = () => {
  // Guard: check credentials are actually set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
      process.env.EMAIL_PASS === 'PASTE_YOUR_16_CHAR_APP_PASSWORD_HERE') {
    throw new Error(
      '📧 Email not configured. Set EMAIL_USER and EMAIL_PASS in .env\n' +
      '   Get an App Password at: https://myaccount.google.com/apppasswords'
    );
  }

  return nodemailer.createTransport({
    service: 'gmail',     // Nodemailer knows Gmail's SMTP settings automatically
    auth: {
      user: process.env.EMAIL_USER,  // bavank065@gmail.com
      pass: process.env.EMAIL_PASS,  // 16-char App Password (NOT your Gmail login!)
    },
    // 'secure: false' means use STARTTLS (port 587). Gmail handles upgrade.
    // Nodemailer's 'service: gmail' sets this correctly for us.
  });
};

// =============================================
// HELPER — Reusable HTML email wrapper
// =============================================
// WHY HTML EMAILS?
// Plain text emails look unprofessional. HTML emails let you add:
// branding, colors, buttons, layout. Every company uses HTML emails.
//
// IMPORTANT: Email clients render HTML differently than browsers.
// No external CSS files — all styles must be INLINE (style="...").
// This is why email HTML looks "old school" with inline styles.

const wrapInTemplate = (title, bodyHTML) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f0f4f8;
">
  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Email card -->
        <table width="600" cellpadding="0" cellspacing="0" style="
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          max-width: 600px;
          width: 100%;
        ">
          <!-- Header -->
          <tr>
            <td style="
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 32px 40px;
              text-align: center;
            ">
              <h1 style="
                margin: 0;
                color: #ffffff;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: -0.5px;
              ">🎒 Campus Lost &amp; Found</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                AI-Powered Item Recovery Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              ${bodyHTML}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              background-color: #f8fafc;
              padding: 24px 40px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            ">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This email was sent by Campus Lost &amp; Found Platform<br>
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// =============================================
// FUNCTION 1 — Welcome Email
// =============================================
// Sent immediately after a new user registers.
// Purpose: confirm the account, build trust, explain next steps.
//
// PARAMETERS:
//   to   — recipient email (e.g., "student@campus.edu")
//   name — student's name (for personalization)

const sendWelcomeEmail = async (to, name) => {
  // Silently skip if email is not configured (dev mode without .env)
  if (!process.env.EMAIL_USER || process.env.EMAIL_PASS === 'PASTE_YOUR_16_CHAR_APP_PASSWORD_HERE') {
    console.log(`📧 [EMAIL SKIPPED — not configured] Would send welcome email to ${name} at ${to}`);
    return { skipped: true };
  }

  try {
    const transporter = createTransporter();

    const bodyHTML = `
      <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 22px;">
        Welcome, ${name}! 👋
      </h2>
      <p style="color: #475569; line-height: 1.7; margin: 0 0 20px;">
        Your Campus Lost &amp; Found account has been created successfully.
        You can now report lost items, browse found items, and use our
        <strong>AI-powered matching</strong> to reunite you with your belongings faster.
      </p>

      <!-- What you can do section -->
      <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
        <p style="margin: 0 0 12px; color: #334155; font-weight: 600; font-size: 15px;">
          🚀 What you can do:
        </p>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #475569; line-height: 2;">
          <li>📋 <strong>Report a lost item</strong> with photos and description</li>
          <li>🔍 <strong>Browse found items</strong> reported by others</li>
          <li>🤖 <strong>AI matching</strong> — automatically find likely matches</li>
          <li>📧 <strong>Get notified</strong> when a match is found for you</li>
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5000'}"
           style="
             display: inline-block;
             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
             color: #ffffff;
             text-decoration: none;
             padding: 14px 32px;
             border-radius: 8px;
             font-weight: 600;
             font-size: 16px;
           ">
          Go to Dashboard →
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
        Lost something? Report it immediately — the sooner you report, the higher the chance of recovery.
      </p>
    `;

    const info = await transporter.sendMail({
      from: `"Campus Lost & Found" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Welcome to Campus Lost & Found, ${name}! 🎒`,
      html: wrapInTemplate('Welcome!', bodyHTML),
    });

    console.log(`✅ Welcome email sent to ${to} — Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    // Log the error but DON'T crash the server or fail registration
    // Email is supplementary — the account was already created
    console.error(`❌ Failed to send welcome email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

// =============================================
// FUNCTION 2 — Match Notification Email
// =============================================
// Sent when the AI finds a high-confidence match between
// a user's lost item and a reported found item.
//
// PARAMETERS:
//   to        — the lost item owner's email
//   lostItem  — { title, description, category }
//   foundItem — { title, description, locationFound, dateFound }
//   score     — confidence score 0-100 from Gemini AI
//   reason    — AI explanation of why it's a match

const sendMatchNotification = async (to, lostItem, foundItem, score = null, reason = null) => {
  // Silently skip if email is not configured
  if (!process.env.EMAIL_USER || process.env.EMAIL_PASS === 'PASTE_YOUR_16_CHAR_APP_PASSWORD_HERE') {
    console.log(`📧 [EMAIL SKIPPED — not configured] Would email ${to} about match for: ${lostItem.title}`);
    return { skipped: true };
  }

  try {
    const transporter = createTransporter();

    // Determine confidence label for display
    const confidenceLabel = score >= 80 ? '🟢 High' : score >= 50 ? '🟡 Medium' : '🔴 Low';
    const scoreDisplay = score !== null ? `${score}%` : 'N/A';

    const bodyHTML = `
      <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 22px;">
        🎉 We found a potential match!
      </h2>
      <p style="color: #475569; line-height: 1.7; margin: 0 0 24px;">
        Our AI has found a <strong>potential match</strong> for your lost item.
        Please check the details below and contact campus security if it's yours.
      </p>

      <!-- Confidence Badge -->
      ${score !== null ? `
      <div style="
        text-align: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        padding: 16px;
        margin: 0 0 24px;
        color: #fff;
      ">
        <p style="margin: 0 0 4px; font-size: 13px; opacity: 0.85;">AI Confidence Score</p>
        <p style="margin: 0; font-size: 32px; font-weight: 700;">${scoreDisplay}</p>
        <p style="margin: 4px 0 0; font-size: 13px;">${confidenceLabel} Match</p>
      </div>` : ''}

      <!-- Two-column comparison -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
        <tr>
          <!-- Your Lost Item -->
          <td width="48%" style="
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            vertical-align: top;
          ">
            <p style="margin: 0 0 8px; font-weight: 700; color: #dc2626; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
              ❌ Your Lost Item
            </p>
            <p style="margin: 0 0 6px; font-weight: 600; color: #1e293b; font-size: 15px;">
              ${lostItem.title || 'Unknown'}
            </p>
            <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
              ${lostItem.description ? lostItem.description.substring(0, 100) + (lostItem.description.length > 100 ? '...' : '') : 'No description'}
            </p>
          </td>

          <!-- Spacer -->
          <td width="4%" style="text-align: center; vertical-align: middle; font-size: 20px;">
            ↔️
          </td>

          <!-- Found Item -->
          <td width="48%" style="
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 16px;
            vertical-align: top;
          ">
            <p style="margin: 0 0 8px; font-weight: 700; color: #16a34a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
              ✅ Found Item
            </p>
            <p style="margin: 0 0 6px; font-weight: 600; color: #1e293b; font-size: 15px;">
              ${foundItem.title || 'Unknown'}
            </p>
            <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
              ${foundItem.description ? foundItem.description.substring(0, 100) + (foundItem.description.length > 100 ? '...' : '') : 'No description'}
            </p>
          </td>
        </tr>
      </table>

      <!-- Found item details -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
        <p style="margin: 0 0 8px; font-weight: 600; color: #334155;">📍 Found Item Details</p>
        <p style="margin: 0 0 4px; color: #475569; font-size: 14px;">
          <strong>Location:</strong> ${foundItem.locationFound || 'Not specified'}
        </p>
        <p style="margin: 0; color: #475569; font-size: 14px;">
          <strong>Date Found:</strong> ${foundItem.dateFound ? new Date(foundItem.dateFound).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified'}
        </p>
      </div>

      <!-- AI Reason -->
      ${reason ? `
      <div style="
        border-left: 4px solid #667eea;
        padding: 12px 16px;
        background: #f1f5f9;
        border-radius: 0 8px 8px 0;
        margin: 0 0 24px;
      ">
        <p style="margin: 0 0 4px; font-weight: 600; color: #334155; font-size: 13px;">🤖 AI Analysis</p>
        <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${reason}</p>
      </div>` : ''}

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5000'}"
           style="
             display: inline-block;
             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
             color: #ffffff;
             text-decoration: none;
             padding: 14px 32px;
             border-radius: 8px;
             font-weight: 600;
             font-size: 16px;
           ">
          View Full Match Details →
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
        Contact campus security or the lost &amp; found office to claim your item.
      </p>
    `;

    const info = await transporter.sendMail({
      from: `"Campus Lost & Found" <${process.env.EMAIL_USER}>`,
      to,
      subject: `🎉 Match Found for "${lostItem.title || 'Your Item'}" — ${scoreDisplay} confidence`,
      html: wrapInTemplate('Match Found!', bodyHTML),
    });

    console.log(`✅ Match notification sent to ${to} — Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error(`❌ Failed to send match notification to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

// =============================================
// FUNCTION 3 — Test Connection (Dev utility)
// =============================================
// Use this to verify your Gmail App Password is working
// without sending an actual email to a real person.
// Call it from the /api/ai/test-email route (dev only).
//
// nodemailer.verify() checks: can we log in to SMTP?
// It does NOT send an email — just tests authentication.

const testEmailConnection = async () => {
  const transporter = createTransporter(); // Will throw if not configured
  
  await transporter.verify(); // Throws if credentials are wrong
  console.log('✅ Gmail SMTP connection verified — email is ready to send');
  return true;
};

module.exports = {
  sendWelcomeEmail,
  sendMatchNotification,
  testEmailConnection,
  createTransporter,
};
