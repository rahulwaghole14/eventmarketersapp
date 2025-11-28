"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetCodeEmail = void 0;
const axios_1 = __importDefault(require("axios"));
const isEmailJSConfigured = () => Boolean(process.env.EMAILJS_PRIVATE_KEY &&
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_TEMPLATE_ID &&
    process.env.EMAILJS_USER_ID);
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
        // Use EmailJS REST API for server-side usage
        const response = await axios_1.default.post('https://api.emailjs.com/api/v1.0/email/send', {
            service_id: process.env.EMAILJS_SERVICE_ID,
            template_id: process.env.EMAILJS_TEMPLATE_ID,
            user_id: process.env.EMAILJS_USER_ID,
            template_params: templateParams
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.EMAILJS_PRIVATE_KEY}`
            }
        });
        console.log(`[EMAILJS] Reset code email sent to ${to} (Status: ${response.status})`);
        return true;
    }
    catch (error) {
        console.error(`[EMAILJS] Failed to send reset code email to ${to}`, error);
        if (error.message) {
            console.error(`[EMAILJS] Error details:`, error.message);
        }
        return false;
    }
};
exports.sendPasswordResetCodeEmail = sendPasswordResetCodeEmail;
//# sourceMappingURL=emailService.js.map