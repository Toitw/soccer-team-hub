import { sendEmail } from './shared/email-utils.ts';

async function testRestriction() {
  console.log('Testing email restriction handling...');
  
  const result = await sendEmail(
    'different.email@gmail.com',
    'Test Subject',
    '<p>Test HTML content</p>',
    'Test text content'
  );
  
  console.log('Result:', result);
}

testRestriction().catch(console.error);
