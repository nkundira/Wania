import 'dotenv/config';

const to = process.argv[2]?.trim();
const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim();

if (!to) {
  console.error('Usage: npm run email:test -- you@example.com');
  process.exit(1);
}
if (!apiKey) {
  console.error('RESEND_API_KEY is missing. Set it in server/.env or Render.');
  process.exit(1);
}
if (!from) {
  console.error('EMAIL_FROM is missing. Use a Resend-verified sender, e.g. WANIA <no-reply@yourdomain.com>.');
  process.exit(1);
}

console.log(`Sending test email from "${from}" to ${to}...`);
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from,
    to,
    subject: 'WANIA email test',
    text: 'If you received this, WANIA transactional email is configured correctly.',
  }),
});

const body = await res.text();
if (!res.ok) {
  console.error(`Resend rejected the request (${res.status}): ${body}`);
  if (res.status === 401) console.error('Hint: the API key is invalid or revoked.');
  if (res.status === 403) {
    console.error('Hint: verify the EMAIL_FROM domain in Resend, or use WANIA <onboarding@resend.dev> for owner-only tests.');
  }
  if (res.status === 422) console.error('Hint: check the EMAIL_FROM and recipient email format.');
  process.exit(1);
}

console.log(`Test email accepted by Resend: ${body}`);
console.log('Check the inbox and spam folder. Delivery is usually a few seconds.');
