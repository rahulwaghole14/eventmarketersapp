type ResetCodeParams = {
  to: string;
  code: string;
  minutesValid?: number;
};

const isEmailJSConfigured = () => Boolean(
  process.env.EMAILJS_PRIVATE_KEY &&
  process.env.EMAILJS_SERVICE_ID &&
  process.env.EMAILJS_TEMPLATE_ID &&
  process.env.EMAILJS_USER_ID
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

    // Use EmailJS REST API for server-side usage
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EMAILJS_PRIVATE_KEY}`
      },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_USER_ID,
        template_params: templateParams
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`EmailJS API error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    console.log(`[EMAILJS] Reset code email sent to ${to} (Status: ${response.status})`);
    return true;
  } catch (error: any) {
    console.error(`[EMAILJS] Failed to send reset code email to ${to}`, error);
    if (error.message) {
      console.error(`[EMAILJS] Error details:`, error.message);
    }
    return false;
  }
};
