/**
 * Email utilities for creating and sending verification and password reset emails
 * with multilingual support (English and Spanish)
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
 * Type for supported languages
 */
export type Language = "en" | "es";

/**
 * Email templates for verification emails in different languages
 */
const verificationEmailTemplates = {
  en: {
    subject: "Verify your email address",
    textTemplate: (username: string, verificationUrl: string) => `
    Hello ${username},
    
    Please verify your email address by clicking the link below:
    
    ${verificationUrl}
    
    If you did not create an account, please ignore this email.
    
    This link will expire in 24 hours.
    
    Thank you,
    Soccer Team Management System
    `,
    htmlTemplate: (username: string, verificationUrl: string) => `
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
    `
  },
  es: {
    subject: "Verifica tu dirección de correo electrónico",
    textTemplate: (username: string, verificationUrl: string) => `
    Hola ${username},
    
    Por favor, verifica tu dirección de correo electrónico haciendo clic en el enlace de abajo:
    
    ${verificationUrl}
    
    Si no has creado una cuenta, por favor ignora este correo electrónico.
    
    Este enlace caducará en 24 horas.
    
    Gracias,
    Sistema de Gestión de Equipos de Fútbol
    `,
    htmlTemplate: (username: string, verificationUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Verifica tu Dirección de Correo Electrónico</h2>
      <p>Hola ${username},</p>
      <p>Por favor, verifica tu dirección de correo electrónico haciendo clic en el botón de abajo:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #4c51bf; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Verificar Correo Electrónico
        </a>
      </div>
      <p>O copia y pega el siguiente enlace en tu navegador:</p>
      <p><a href="${verificationUrl}" style="color: #4c51bf; word-break: break-all;">${verificationUrl}</a></p>
      <p>Si no has creado una cuenta, por favor ignora este correo electrónico.</p>
      <p><em>Este enlace caducará en 24 horas.</em></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #718096; font-size: 12px;">
        Sistema de Gestión de Equipos de Fútbol<br />
        Este es un correo electrónico automático, por favor no respondas.
      </p>
    </div>
    `
  }
};

/**
 * Email templates for password reset emails in different languages
 */
const passwordResetEmailTemplates = {
  en: {
    subject: "Reset your password",
    textTemplate: (username: string, resetUrl: string) => `
    Hello ${username},
    
    We received a request to reset your password. Please click the link below to set a new password:
    
    ${resetUrl}
    
    If you did not request a password reset, please ignore this email and your password will remain unchanged.
    
    This link will expire in 1 hour.
    
    Thank you,
    Soccer Team Management System
    `,
    htmlTemplate: (username: string, resetUrl: string) => `
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
    `
  },
  es: {
    subject: "Restablece tu contraseña",
    textTemplate: (username: string, resetUrl: string) => `
    Hola ${username},
    
    Hemos recibido una solicitud para restablecer tu contraseña. Por favor, haz clic en el enlace de abajo para establecer una nueva contraseña:
    
    ${resetUrl}
    
    Si no has solicitado el restablecimiento de contraseña, por favor ignora este correo electrónico y tu contraseña permanecerá sin cambios.
    
    Este enlace caducará en 1 hora.
    
    Gracias,
    Sistema de Gestión de Equipos de Fútbol
    `,
    htmlTemplate: (username: string, resetUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Restablece tu Contraseña</h2>
      <p>Hola ${username},</p>
      <p>Hemos recibido una solicitud para restablecer tu contraseña. Por favor, haz clic en el botón de abajo para establecer una nueva contraseña:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #4c51bf; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Restablecer Contraseña
        </a>
      </div>
      <p>O copia y pega el siguiente enlace en tu navegador:</p>
      <p><a href="${resetUrl}" style="color: #4c51bf; word-break: break-all;">${resetUrl}</a></p>
      <p>Si no has solicitado el restablecimiento de contraseña, por favor ignora este correo electrónico y tu contraseña permanecerá sin cambios.</p>
      <p><em>Este enlace caducará en 1 hora.</em></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #718096; font-size: 12px;">
        Sistema de Gestión de Equipos de Fútbol<br />
        Este es un correo electrónico automático, por favor no respondas.
      </p>
    </div>
    `
  }
};

/**
 * Generate a verification email with a clickable link
 * @param username - The recipient's username
 * @param token - The verification token
 * @param baseUrl - The base URL for the verification link
 * @param language - The language to use (en or es)
 * @returns An object containing the email subject, text and HTML content
 */
export function generateVerificationEmail(
  username: string,
  token: string,
  baseUrl: string,
  language: Language = "es" // Default to Spanish
): EmailContent {
  // Build the verification URL with token as query parameter
  const verificationUrl = `${baseUrl}?token=${token}`;
  
  // Get the template for the specified language (default to English if language not supported)
  const template = verificationEmailTemplates[language] || verificationEmailTemplates.en;
  
  // Generate the email content using the templates
  const subject = template.subject;
  const text = template.textTemplate(username, verificationUrl).trim();
  const html = template.htmlTemplate(username, verificationUrl).trim();
  
  return { subject, text, html };
}

/**
 * Generate a password reset email with a clickable link
 * @param username - The recipient's username
 * @param token - The reset token
 * @param baseUrl - The base URL for the reset link
 * @param language - The language to use (en or es)
 * @returns An object containing the email subject, text and HTML content
 */
export function generatePasswordResetEmail(
  username: string,
  token: string,
  baseUrl: string,
  language: Language = "es" // Default to Spanish
): EmailContent {
  // Build the reset URL with token as query parameter
  const resetUrl = `${baseUrl}?token=${token}`;
  
  // Get the template for the specified language (default to English if language not supported)
  const template = passwordResetEmailTemplates[language] || passwordResetEmailTemplates.en;
  
  // Generate the email content using the templates
  const subject = template.subject;
  const text = template.textTemplate(username, resetUrl).trim();
  const html = template.htmlTemplate(username, resetUrl).trim();
  
  return { subject, text, html };
}

/**
 * Send an email using SendGrid
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
    // Import SendGrid dynamically to avoid server-side only code in client bundle
    const sgMail = await import('@sendgrid/mail');
    
    // Get SendGrid API key from environment variables
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      console.error('SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable.');
      return {
        success: false,
        message: 'Email configuration error: Missing SendGrid API key'
      };
    }
    
    // Set the API key
    sgMail.default.setApiKey(apiKey);
    
    // Set the sender email
    const fromEmail = "canchaplusapp@gmail.com";
    
    // Log that we're attempting to send an email
    console.log(`Sending email to ${to} with subject "${subject}"`);
    
    // Define email message
    const msg = {
      to,
      from: fromEmail,
      subject,
      text,
      html
    };
    
    // Send the email
    const response = await sgMail.default.send(msg);
    
    console.log(`Email sent successfully with status code: ${response[0].statusCode}`);
    
    return {
      success: true,
      message: `Email sent to ${to}`
    };
  } catch (error) {
    // Log the full error for debugging
    console.error('Error sending email with SendGrid:', error);
    
    // Extract the most relevant error information
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Additional info for debugging
      if ('response' in error && error.response) {
        try {
          const responseBody = JSON.stringify(error.response);
          console.error('SendGrid error response:', responseBody);
        } catch (e) {
          console.error('Unable to stringify SendGrid error response');
        }
      }
    } else {
      errorMessage = String(error);
    }
    
    return {
      success: false,
      message: `Failed to send email: ${errorMessage}`
    };
  }
}