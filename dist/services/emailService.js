"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetCodeEmail = void 0;
const nodejs_1 = __importDefault(require("@emailjs/nodejs"));
const isEmailJSConfigured = () => Boolean(process.env.EMAILJS_PUBLIC_KEY &&
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_TEMPLATE_ID);
const sendPasswordResetCodeEmail = async ({ to, code, minutesValid = Number(process.env.PASSWORD_RESET_CODE_EXPIRY_MINUTES || 15) }) => {
    if (!isEmailJSConfigured()) {
        console.warn('[EMAILJS] EmailJS environment variables missing. Unable to send emails.');
        console.warn(`[EMAILJS] Skipping email send. Code for ${to}: ${code}`);
        return false;
    }
    try {
        const templateParams = {
            to_email: to,
            reset_code: code,
            minutes_valid: minutesValid.toString(),
            app_name: 'Event Marketers'
        };
        const response = await nodejs_1.default.send(process.env.EMAILJS_SERVICE_ID, process.env.EMAILJS_TEMPLATE_ID, templateParams, {
            publicKey: process.env.EMAILJS_PUBLIC_KEY
        });
        console.log(`[EMAILJS] Reset code email sent to ${to} (Status: ${response.status}, Text: ${response.text})`);
        return true;
    }
    catch (error) {
        console.error(`[EMAILJS] Failed to send reset code email to ${to}`, error);
        if (error.response) {
            console.error(`[EMAILJS] Error details:`, error.response.data);
        }
        return false;
    }
};
exports.sendPasswordResetCodeEmail = sendPasswordResetCodeEmail;
//# sourceMappingURL=emailService.js.map