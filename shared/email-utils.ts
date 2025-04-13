/**
 * Email verification and handling utilities
 */

/**
 * Generate a verification email message
 * @param username - The user's username
 * @param token - The verification token
 * @param verificationUrl - The base URL for verification
 * @returns An email message object with subject and content
 */
export function generateVerificationEmail(
  username: string, 
  token: string, 
  verificationUrl: string
): { subject: string; html: string; text: string } {
  const verificationLink = `${verificationUrl}?token=${token}`;
  
  return {
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to TeamKick!</h2>
        <p>Hi ${username},</p>
        <p>Thank you for registering with TeamKick. Please verify your email address by clicking the button below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
            style="background-color: #4CAF50; color: white; padding: 12px 20px; 
            text-decoration: none; border-radius: 4px; font-weight: bold;">
            Verify Email Address
          </a>
        </p>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br>The TeamKick Team</p>
      </div>
    `,
    text: `
      Welcome to TeamKick!
      
      Hi ${username},
      
      Thank you for registering with TeamKick. Please verify your email address by clicking the link below:
      
      ${verificationLink}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, you can safely ignore this email.
      
      Best regards,
      The TeamKick Team
    `
  };
}

/**
 * Generate a password reset email
 * @param username - The user's username
 * @param token - The reset token
 * @param resetUrl - The base URL for password reset
 * @returns An email message object with subject and content
 */
export function generatePasswordResetEmail(
  username: string, 
  token: string, 
  resetUrl: string
): { subject: string; html: string; text: string } {
  const resetLink = `${resetUrl}?token=${token}`;
  
  return {
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${username},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
            style="background-color: #4CAF50; color: white; padding: 12px 20px; 
            text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </p>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetLink}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Best regards,<br>The TeamKick Team</p>
      </div>
    `,
    text: `
      Password Reset Request
      
      Hi ${username},
      
      We received a request to reset your password. Click the link below to set a new password:
      
      ${resetLink}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, you can safely ignore this email.
      
      Best regards,
      The TeamKick Team
    `
  };
}

/**
 * Mock email sender for testing purposes
 * In a production environment, this would be replaced with an actual email service
 */
export async function sendEmail(
  to: string, 
  subject: string, 
  html: string, 
  text: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // This is just a placeholder - in production, you would integrate with:
    // - SendGrid
    // - AWS SES
    // - Mailchimp
    // - Or other email service

    // Log email for development purposes
    console.log(`Email sent to ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text content: ${text.substring(0, 100)}...`);
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error sending email' 
    };
  }
}