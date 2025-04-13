/**
 * Email utilities for generating and sending verification emails
 * 
 * Note: This is a mock implementation. In a production environment,
 * you should use a real email service like SendGrid, Mailgun, etc.
 */

/**
 * Generate a verification email
 * @param username - The username of the recipient
 * @param token - The verification token
 * @param baseUrl - The base URL for verification
 * @returns An object containing email subject, HTML, and text content
 */
export function generateVerificationEmail(
  username: string, 
  token: string, 
  baseUrl: string
): { subject: string; html: string; text: string } {
  const verificationLink = `${baseUrl}?token=${token}`;
  
  return {
    subject: "Verify your email address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a5568;">Email Verification</h2>
        <p>Hi ${username},</p>
        <p>Thank you for creating an account. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #3182ce; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
        <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all;">${verificationLink}</p>
      </div>
    `,
    text: `
      Email Verification
      
      Hi ${username},
      
      Thank you for creating an account. Please verify your email address by visiting the link below:
      
      ${verificationLink}
      
      If you didn't create an account, you can safely ignore this email.
      
      This link will expire in 24 hours.
    `
  };
}

/**
 * Generate a password reset email
 * @param username - The username of the recipient
 * @param token - The reset token
 * @param baseUrl - The base URL for password reset
 * @returns An object containing email subject, HTML, and text content
 */
export function generatePasswordResetEmail(
  username: string, 
  token: string, 
  baseUrl: string
): { subject: string; html: string; text: string } {
  const resetLink = `${baseUrl}?token=${token}`;
  
  return {
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a5568;">Password Reset</h2>
        <p>Hi ${username},</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #3182ce; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all;">${resetLink}</p>
      </div>
    `,
    text: `
      Password Reset
      
      Hi ${username},
      
      We received a request to reset your password. Please visit the link below to reset it:
      
      ${resetLink}
      
      If you didn't request a password reset, you can safely ignore this email.
      
      This link will expire in 1 hour.
    `
  };
}

/**
 * Mock function to send an email
 * In a production environment, this would use a real email service
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML email content
 * @param text - Plain text email content
 * @returns Promise resolving to success or failure
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; message?: string }> {
  // In a production environment, you would use a real email service like SendGrid, Mailgun, etc.
  // This is a mock implementation that logs the email to the console
  
  console.log("==== EMAIL SENT (MOCK) ====");
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log("TEXT CONTENT:");
  console.log(text);
  console.log("==========================");
  
  // Simulate a successful email send
  return { success: true };
  
  // To simulate failures for testing:
  // return { success: false, message: "Failed to send email" };
}