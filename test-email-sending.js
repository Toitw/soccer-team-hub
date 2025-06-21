/**
 * Test script to diagnose email sending issues
 */
const { config } = require('dotenv');
const sgMail = require('@sendgrid/mail');

// Load environment variables
config({ path: '.env.local' });

async function testEmailSending() {
  console.log('Testing email sending functionality...');
  
  // Check if SendGrid API key is available
  const hasApiKey = !!process.env.SENDGRID_API_KEY;
  console.log('SendGrid API Key configured:', hasApiKey);
  
  if (!hasApiKey) {
    console.error('No SendGrid API key found in environment variables');
    return;
  }
  
  // Set the API key
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  // Generate test email content
  const verificationUrl = 'https://your-app.com/verify-email?token=test-token-123';
  
  const emailContent = {
    subject: 'Cancha+ Verificación de Correo Electrónico',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Cancha+ Verificación de Correo Electrónico</h2>
        <p>Hola juroga,</p>
        <p>Gracias por registrarte en Cancha+. Por favor verifica tu correo electrónico haciendo clic en el botón a continuación:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verificar Correo
          </a>
        </p>
        <p>Alternativamente, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
        <p>${verificationUrl}</p>
        <p>Si no creaste una cuenta, ignora este correo electrónico.</p>
        <p>Gracias,<br>El Equipo de Cancha+</p>
      </div>
    `,
    text: `Hola juroga,

Gracias por registrarte en Cancha+. Por favor verifica tu correo electrónico visitando el siguiente enlace:

${verificationUrl}

Si no creaste una cuenta, ignora este correo electrónico.

Gracias,
El Equipo de Cancha+`
  };
  
  console.log('Email content generated:');
  console.log('Subject:', emailContent.subject);
  console.log('To:', 'juanjrgast@gmail.com');
  
  try {
    const msg = {
      to: 'juanjrgast@gmail.com',
      from: 'canchaplusapp@gmail.com',
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };

    console.log('Attempting to send email...');
    const result = await sgMail.send(msg);
    
    console.log('Email send result:', result);
    console.log('✅ Email sent successfully');
    
  } catch (error) {
    console.error('❌ Error during email test:', error);
    
    if (error.response) {
      console.error('SendGrid error response:', error.response.body);
    }
  }
}

testEmailSending();