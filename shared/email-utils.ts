/**
 * Email utility functions for sending emails in the application
 * Uses SendGrid API for email delivery
 */

import { MailService } from '@sendgrid/mail';
import * as fs from 'fs';
import * as path from 'path';

// Initialize the SendGrid mail service
const mailService = new MailService();

// Flag to track if SendGrid has been initialized
let isInitialized = false;

/**
 * Initialize SendGrid with API key
 * This ensures proper timing for environment variable loading
 */
function initializeMailService() {
  if (isInitialized) {
    return true;
  }
  
  if (process.env.SENDGRID_API_KEY) {
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    isInitialized = true;
    console.log('SendGrid email service initialized successfully');
    return true;
  } else {
    console.warn('SENDGRID_API_KEY environment variable is not set. Email functionality will not work.');
    return false;
  }
}

/**
 * Send an email using SendGrid API
 * 
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML content of the email
 * @param text - Plain text content of the email
 * @param fromEmail - Sender email address (defaults to canchaplusapp@gmail.com)
 * @returns Object with success status and optional error message
 */
export async function sendEmail(
  to: string, 
  subject: string, 
  html: string, 
  text?: string,
  fromEmail: string = 'canchaplusapp@gmail.com'
): Promise<{ success: boolean; message?: string }> {
  // Initialize SendGrid service with proper timing
  if (!initializeMailService()) {
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
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if text not provided
      html,
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
  
  const html = `
    <h2>New Feedback Submission</h2>
    <p><strong>Type:</strong> ${type}</p>
    <p><strong>From:</strong> ${name || "Anonymous"} ${email ? `(${email})` : ""}</p>
    ${userId ? `<p><strong>User ID:</strong> ${userId}</p>` : ""}
    <p><strong>Subject:</strong> ${subject}</p>
    <h3>Message:</h3>
    <p>${message.replace(/\n/g, '<br>')}</p>
  `;
  
  const text = `
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
    html,
    text
  );
}

/**
 * Generate an email for email verification
 * 
 * @param username - User's username
 * @param token - Email verification token
 * @param baseUrl - Base URL for the verification link
 * @param language - Language preference for email content
 * @returns Email content with verification link
 */
export function generateVerificationEmail(
  username: string,
  token: string,
  baseUrl?: string,
  language?: string
): { subject: string; html: string; text: string } {
  const verificationUrl = baseUrl 
    ? `${baseUrl}?token=${token}`
    : `${process.env.APP_URL || 'https://app.cancha.plus'}/verify-email?token=${token}`;
  
  // Set subject based on language
  const subject = language === 'en' 
    ? "Cancha+ Email Verification" 
    : "Cancha+ Verificación de Correo Electrónico";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Cancha+ ${language === 'en' ? 'Email Verification' : 'Verificación de Correo Electrónico'}</h2>
      <p>${language === 'en' ? 'Hello' : 'Hola'} ${username},</p>
      <p>${language === 'en' 
          ? 'Thank you for signing up with Cancha+. Please verify your email address by clicking the button below:' 
          : 'Gracias por registrarte en Cancha+. Por favor verifica tu correo electrónico haciendo clic en el botón a continuación:'}</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          ${language === 'en' ? 'Verify Email' : 'Verificar Correo'}
        </a>
      </p>
      <p>${language === 'en' 
          ? 'Alternatively, you can copy and paste the following link into your browser:' 
          : 'Alternativamente, puedes copiar y pegar el siguiente enlace en tu navegador:'}</p>
      <p>${verificationUrl}</p>
      <p>${language === 'en' 
          ? 'If you did not create an account, please ignore this email.' 
          : 'Si no creaste una cuenta, ignora este correo electrónico.'}</p>
      <p>${language === 'en' ? 'Thanks,' : 'Gracias,'}<br>The Cancha+ Team</p>
    </div>
  `;
  
  const text = language === 'en'
    ? `
Hello ${username},

Thank you for signing up with Cancha+. Please verify your email address by visiting the link below:

${verificationUrl}

If you did not create an account, please ignore this email.

Thanks,
The Cancha+ Team
    `
    : `
Hola ${username},

Gracias por registrarte en Cancha+. Por favor verifica tu correo electrónico visitando el siguiente enlace:

${verificationUrl}

Si no creaste una cuenta, ignora este correo electrónico.

Gracias,
El Equipo de Cancha+
    `;
  
  return { subject, html, text };
}

/**
 * Generate an email for password reset
 * 
 * @param username - User's username
 * @param token - Password reset token
 * @param baseUrl - Base URL for the reset link
 * @param language - Language preference for email content
 * @returns Email content with password reset link
 */
export function generatePasswordResetEmail(
  username: string,
  token: string,
  baseUrl?: string,
  language?: string
): { subject: string; html: string; text: string } {
  const resetUrl = baseUrl 
    ? `${baseUrl}?token=${token}`
    : `${process.env.APP_URL || 'https://app.cancha.plus'}/reset-password?token=${token}`;
  
  // Set subject based on language
  const subject = language === 'en' 
    ? "Cancha+ Password Reset" 
    : "Cancha+ Restablecimiento de Contraseña";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Cancha+ ${language === 'en' ? 'Password Reset' : 'Restablecimiento de Contraseña'}</h2>
      <p>${language === 'en' ? 'Hello' : 'Hola'} ${username},</p>
      <p>${language === 'en' 
          ? 'We received a request to reset your password. Click the button below to create a new password:' 
          : 'Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón a continuación para crear una nueva contraseña:'}</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          ${language === 'en' ? 'Reset Password' : 'Restablecer Contraseña'}
        </a>
      </p>
      <p>${language === 'en' 
          ? 'Alternatively, you can copy and paste the following link into your browser:' 
          : 'Alternativamente, puedes copiar y pegar el siguiente enlace en tu navegador:'}</p>
      <p>${resetUrl}</p>
      <p>${language === 'en' 
          ? 'If you did not request a password reset, please ignore this email and your password will remain unchanged.' 
          : 'Si no solicitaste un restablecimiento de contraseña, ignora este correo y tu contraseña permanecerá sin cambios.'}</p>
      <p>${language === 'en' 
          ? 'This password reset link will expire in 1 hour.' 
          : 'Este enlace de restablecimiento de contraseña caducará en 1 hora.'}</p>
      <p>${language === 'en' ? 'Thanks,' : 'Gracias,'}<br>The Cancha+ Team</p>
    </div>
  `;
  
  const text = language === 'en'
    ? `
Hello ${username},

We received a request to reset your password. Please visit the link below to create a new password:

${resetUrl}

If you did not request a password reset, please ignore this email and your password will remain unchanged.

This password reset link will expire in 1 hour.

Thanks,
The Cancha+ Team
    `
    : `
Hola ${username},

Recibimos una solicitud para restablecer tu contraseña. Por favor visita el siguiente enlace para crear una nueva contraseña:

${resetUrl}

Si no solicitaste un restablecimiento de contraseña, ignora este correo y tu contraseña permanecerá sin cambios.

Este enlace de restablecimiento de contraseña caducará en 1 hora.

Gracias,
El Equipo de Cancha+
    `;
  
  return { subject, html, text };
}