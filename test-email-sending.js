/**
 * Test script to diagnose email sending issues
 */
import { config } from 'dotenv';
import { Resend } from 'resend';

// Load environment variables
config({ path: '.env.local' });

async function testEmailSending() {
  console.log('Testing email sending functionality...');
  
  // Check if Resend API key is available
  const hasApiKey = !!process.env.RESEND_API_KEY;
  console.log('Resend API Key configured:', hasApiKey);
  
  if (!hasApiKey) {
    console.error('No Resend API key found in environment variables');
    return;
  }
  
  // Initialize Resend client
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  // Generate test email content with actual verification token
  const verificationUrl = 'https://d985c910-be15-4a53-9b2c-481d78aa3062-00-29aoyq49zmm0j.worf.replit.dev/verify-email?token=bc5764c79840fa3b0bff4701bd7005812d9b5eb886151196e9a107d95002fe43';
  
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
    console.log('Attempting to send email...');
    const result = await resend.emails.send({
      from: 'Cancha+ <onboarding@resend.dev>',
      to: ['juanjrgast@gmail.com'],
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
    
    if (result.error) {
      console.error('❌ Resend error:', result.error);
    } else {
      console.log('Email send result:', result);
      console.log('✅ Email sent successfully with ID:', result.data?.id);
    }
    
  } catch (error) {
    console.error('❌ Error during email test:', error);
  }
}

testEmailSending();