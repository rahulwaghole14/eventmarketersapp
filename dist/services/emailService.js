"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetCodeEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const isEmailConfigured = () => Boolean(process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM);
let emailTransporter = null;
const getEmailTransporter = () => {
    if (!isEmailConfigured()) {
        if (!emailTransporter) {
            console.warn('[EMAIL] SMTP environment variables missing. Unable to send emails.');
        }
        return null;
    }
    if (emailTransporter) {
        return emailTransporter;
    }
    try {
        const port = parseInt(process.env.SMTP_PORT, 10) || 587;
        const secure = process.env.SMTP_SECURE
            ? process.env.SMTP_SECURE.toLowerCase() === 'true'
            : port === 465;
        emailTransporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: port,
            secure: secure,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        console.log('[EMAIL] SMTP transporter initialized');
        return emailTransporter;
    }
    catch (error) {
        console.error('[EMAIL] Failed to create transporter', error);
        return null;
    }
};
const sendPasswordResetCodeEmail = async ({ to, code, minutesValid = Number(process.env.PASSWORD_RESET_CODE_EXPIRY_MINUTES || 15) }) => {
    const transporter = getEmailTransporter();
    if (!transporter) {
        console.warn(`[EMAIL] Skipping email send. Code for ${to}: ${code}`);
        return false;
    }
    try {
        const from = process.env.SMTP_FROM || 'Event Marketers <no-reply@eventmarketers.com>';
        const subject = 'Your Event Marketers Password Reset Code';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi,</p>
        <p>Use the verification code below to reset your Event Marketers password:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
          <h1 style="color: #007bff; font-size: 32px; letter-spacing: 4px; margin: 0;">${code}</h1>
        </div>
        <p>This code expires in ${minutesValid} minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">— Event Marketers Team</p>
      </div>
    `;
        const text = `Use the verification code ${code} to reset your password. The code expires in ${minutesValid} minutes.`;
        const info = await transporter.sendMail({
            from,
            to,
            subject,
            text,
            html
        });
        console.log(`[EMAIL] Reset code email sent to ${to} (Message ID: ${info.messageId})`);
        return true;
    }
    catch (error) {
        console.error(`[EMAIL] Failed to send reset code email to ${to}`, error);
        return false;
    }
};
exports.sendPasswordResetCodeEmail = sendPasswordResetCodeEmail;
//# sourceMappingURL=emailService.js.map