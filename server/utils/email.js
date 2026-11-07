import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@pjcreativehouse.com', // Your verified custom domain address
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error };
  }
};