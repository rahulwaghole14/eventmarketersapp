import emailjs from '@emailjs/nodejs';

type ResetCodeParams = {
  to: string;
  code: string;
  minutesValid?: number;
};

const isEmailJSConfigured = () => Boolean(
  process.env.EMAILJS_PUBLIC_KEY &&
  process.env.EMAILJS_SERVICE_ID &&
  process.env.EMAILJS_TEMPLATE_ID
);

export const sendPasswordResetCodeEmail = async ({
  to,
  code,
  minutesValid = Number(process.env.PASSWORD_RESET_CODE_EXPIRY_MINUTES || 15)
}: ResetCodeParams): Promise<boolean> => {
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

    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID!,
      process.env.EMAILJS_TEMPLATE_ID!,
      templateParams,
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY!
      }
    );

    console.log(`[EMAILJS] Reset code email sent to ${to} (Status: ${response.status}, Text: ${response.text})`);
    return true;
  } catch (error: any) {
    console.error(`[EMAILJS] Failed to send reset code email to ${to}`, error);
    if (error.response) {
      console.error(`[EMAILJS] Error details:`, error.response.data);
    }
    return false;
  }
};
