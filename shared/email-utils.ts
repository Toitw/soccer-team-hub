/**
 * Email utilities for creating and sending verification and password reset emails
 */

/**
 * Interface for return type of email sending functions
 */
interface EmailSendResult {
  success: boolean;
  message: string;
}

/**
 * Interface for email content
 */
interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Generate a verification email with a clickable link
 * @param username - The recipient's username
 * @param token - The verification token
 * @param baseUrl - The base URL for the verification link
 * @returns An object containing the email subject, text and HTML content
 */
export function generateVerificationEmail(
  username: string,
  token: string,
  baseUrl: string
): EmailContent {
  // Build the verification URL with token as query parameter
  const verificationUrl = `${baseUrl}?token=${token}`;
  
  const subject = "Verify your email address";
  
  // Plain text version
  const text = `
    Hello ${username},
    
    Please verify your email address by clicking the link below:
    
    ${verificationUrl}
    
    If you did not create an account, please ignore this email.
    
    This link will expire in 24 hours.
    
    Thank you,
    Soccer Team Management System
  `.trim();
  
  // HTML version
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Verify Your Email Address</h2>
      <p>Hello ${username},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #4c51bf; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Verify Email Address
        </a>
      </div>
      <p>Or copy and paste the following link in your browser:</p>
      <p><a href="${verificationUrl}" style="color: #4c51bf; word-break: break-all;">${verificationUrl}</a></p>
      <p>If you did not create an account, please ignore this email.</p>
      <p><em>This link will expire in 24 hours.</em></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #718096; font-size: 12px;">
        Soccer Team Management System<br />
        This is an automated email, please do not reply.
      </p>
    </div>
  `.trim();
  
  return { subject, text, html };
}

/**
 * Generate a password reset email with a clickable link
 * @param username - The recipient's username
 * @param token - The reset token
 * @param baseUrl - The base URL for the reset link
 * @returns An object containing the email subject, text and HTML content
 */
export function generatePasswordResetEmail(
  username: string,
  token: string,
  baseUrl: string
): EmailContent {
  // Build the reset URL with token as query parameter
  const resetUrl = `${baseUrl}?token=${token}`;
  
  const subject = "Reset your password";
  
  // Plain text version
  const text = `
    Hello ${username},
    
    We received a request to reset your password. Please click the link below to set a new password:
    
    ${resetUrl}
    
    If you did not request a password reset, please ignore this email and your password will remain unchanged.
    
    This link will expire in 1 hour.
    
    Thank you,
    Soccer Team Management System
  `.trim();
  
  // HTML version
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Reset Your Password</h2>
      <p>Hello ${username},</p>
      <p>We received a request to reset your password. Please click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #4c51bf; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste the following link in your browser:</p>
      <p><a href="${resetUrl}" style="color: #4c51bf; word-break: break-all;">${resetUrl}</a></p>
      <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
      <p><em>This link will expire in 1 hour.</em></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #718096; font-size: 12px;">
        Soccer Team Management System<br />
        This is an automated email, please do not reply.
      </p>
    </div>
  `.trim();
  
  return { subject, text, html };
}

/**
 * Send an email using nodemailer
 * @param to - The recipient's email address
 * @param subject - The email subject
 * @param html - The HTML content
 * @param text - The plain text content
 * @returns An object indicating success or failure
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<EmailSendResult> {
  try {
    // Import nodemailer dynamically to avoid server-side only code in client bundle
    const nodemailer = await import('nodemailer');
    
    // Get email credentials from environment variables
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    
    if (!emailUser || !emailPassword) {
      console.error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
      return {
        success: false,
        message: 'Email configuration error: Missing credentials'
      };
    }
    
    // Log that we're attempting to send an email (but don't log credentials)
    console.log(`Sending email to ${to} with subject "${subject}"`);
    
    // Create a transporter for Gmail
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
    
    // Define email options
    const mailOptions = {
      from: emailUser,
      to,
      subject,
      text,
      html
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Email sent successfully: ${info.messageId}`);
    
    return {
      success: true,
      message: `Email sent to ${to} (Message ID: ${info.messageId})`
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    return {
      success: false,
      message: `Failed to send email: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}