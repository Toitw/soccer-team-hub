/**
 * Email utility functions for sending emails in the application
 * Uses SendGrid API for email delivery
 */

import { MailService } from '@sendgrid/mail';
import * as fs from 'fs';
import * as path from 'path';

// Initialize the SendGrid mail service
const mailService = new MailService();

// Check if SendGrid API key is available
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY environment variable is not set. Email functionality will not work.');
}

/**
 * Send an email using SendGrid API
 * 
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param htmlContent - HTML content of the email
 * @param textContent - Plain text content of the email
 * @param fromEmail - Sender email address (defaults to canchaplusapp@gmail.com)
 * @returns Object with success status and optional error message
 */
export async function sendEmail(
  to: string, 
  subject: string, 
  htmlContent: string, 
  textContent?: string,
  fromEmail: string = 'canchaplusapp@gmail.com'
): Promise<{ success: boolean; message?: string }> {
  // If SENDGRID_API_KEY is not set, return error
  if (!process.env.SENDGRID_API_KEY) {
    return { 
      success: false, 
      message: 'SendGrid API key is not configured. Email could not be sent.' 
    };
  }

  try {
    const msg = {
      to,
      from: fromEmail,
      subject,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML if text not provided
      html: htmlContent,
    };

    await mailService.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid email error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

/**
 * Send a feedback notification email
 * 
 * @param feedback - Feedback data
 * @param adminEmail - Admin email to receive the notification
 * @returns Object with success status and optional error message
 */
export async function sendFeedbackNotification(
  feedback: {
    name?: string;
    email?: string;
    type: string;
    subject: string;
    message: string;
    userId?: number | null;
  },
  adminEmail: string = 'canchaplusapp@gmail.com'
): Promise<{ success: boolean; message?: string }> {
  const { name, email, type, subject, message, userId } = feedback;
  
  const emailSubject = `Feedback: ${subject}`;
  
  const emailHtml = `
    <h2>New Feedback Submission</h2>
    <p><strong>Type:</strong> ${type}</p>
    <p><strong>From:</strong> ${name || "Anonymous"} ${email ? `(${email})` : ""}</p>
    ${userId ? `<p><strong>User ID:</strong> ${userId}</p>` : ""}
    <p><strong>Subject:</strong> ${subject}</p>
    <h3>Message:</h3>
    <p>${message.replace(/\n/g, '<br>')}</p>
  `;
  
  const emailText = `
Type: ${type}
From: ${name || "Anonymous"} ${email ? `(${email})` : ""}
${userId ? `User ID: ${userId}` : ""}
Subject: ${subject}
Message:
${message}
  `;
  
  return await sendEmail(
    adminEmail,
    emailSubject,
    emailHtml,
    emailText
  );
}

/**
 * Generate an email for email verification
 * 
 * @param username - User's username
 * @param token - Email verification token
 * @returns Email content with verification link
 */
export function generateVerificationEmail(
  username: string,
  token: string
): { subject: string; htmlContent: string; textContent: string } {
  const subject = "Cancha+ Email Verification";
  const verificationUrl = `${process.env.APP_URL || 'https://app.cancha.plus'}/verify-email/${token}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Cancha+ Email Verification</h2>
      <p>Hello ${username},</p>
      <p>Thank you for signing up with Cancha+. Please verify your email address by clicking the button below:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Verify Email
        </a>
      </p>
      <p>Alternatively, you can copy and paste the following link into your browser:</p>
      <p>${verificationUrl}</p>
      <p>If you did not create an account, please ignore this email.</p>
      <p>Thanks,<br>The Cancha+ Team</p>
    </div>
  `;
  
  const textContent = `
Hello ${username},

Thank you for signing up with Cancha+. Please verify your email address by visiting the link below:

${verificationUrl}

If you did not create an account, please ignore this email.

Thanks,
The Cancha+ Team
  `;
  
  return { subject, htmlContent, textContent };
}

/**
 * Generate an email for password reset
 * 
 * @param username - User's username
 * @param token - Password reset token
 * @returns Email content with password reset link
 */
export function generatePasswordResetEmail(
  username: string,
  token: string
): { subject: string; htmlContent: string; textContent: string } {
  const subject = "Cancha+ Password Reset";
  const resetUrl = `${process.env.APP_URL || 'https://app.cancha.plus'}/reset-password/${token}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Cancha+ Password Reset</h2>
      <p>Hello ${username},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p>Alternatively, you can copy and paste the following link into your browser:</p>
      <p>${resetUrl}</p>
      <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
      <p>This password reset link will expire in 1 hour.</p>
      <p>Thanks,<br>The Cancha+ Team</p>
    </div>
  `;
  
  const textContent = `
Hello ${username},

We received a request to reset your password. Please visit the link below to create a new password:

${resetUrl}

If you did not request a password reset, please ignore this email and your password will remain unchanged.

This password reset link will expire in 1 hour.

Thanks,
The Cancha+ Team
  `;
  
  return { subject, htmlContent, textContent };
}