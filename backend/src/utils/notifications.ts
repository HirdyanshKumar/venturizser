import { ScoringResult } from './scoring';

export interface EmailPayload {
  to: string;
  name: string;
  score: number;
  bucket: string;
  clarificationQuestion?: string;
}

/**
 * Sends a bucket-specific email to the lead using the Resend API.
 */
export async function sendBucketEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY is not configured. Skipping email.');
    return false;
  }

  const { to, name, score, bucket, clarificationQuestion } = payload;
  let subject = '';
  let html = '';

  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  switch (bucket) {
    case 'hot':
      subject = 'Your application to Venturizer - Next Steps';
      html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #16213a;">
          <h2 style="color: #1f4294;">Hi ${name},</h2>
          <p>Thank you for submitting your details to Venturizer.</p>
          <p>We are thrilled to let you know that your profile fits our investment criteria perfectly! We would love to schedule an introductory call to discuss program details.</p>
          <p><strong>Please book a slot directly on our calendar here:</strong></p>
          <p><a href="https://calendly.com/venturizer-meetings/intro" style="display: inline-block; padding: 10px 20px; background-color: #f2403d; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">Book Call Slot</a></p>
          <p>Best regards,<br/>The Venturizer Team</p>
        </div>
      `;
      break;

    case 'good':
      subject = 'Your application to Venturizer';
      html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #16213a;">
          <h2>Hi ${name},</h2>
          <p>Thank you for sharing details about your startup.</p>
          <p>We have received your responses and our investment team is currently reviewing them. We will get back to you with next steps within the next 3-5 business days.</p>
          <p>Best regards,<br/>The Venturizer Team</p>
        </div>
      `;
      break;

    case 'maybe':
      subject = 'Follow-up regarding your Venturizer application';
      html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #16213a;">
          <h2>Hi ${name},</h2>
          <p>Thank you for applying to Venturizer.</p>
          <p>We reviewed your responses and had a quick follow-up question to help us better evaluate fit:</p>
          <blockquote style="border-left: 4px solid #d98e3f; padding-left: 15px; margin: 20px 0; color: #594f45; font-style: italic;">
            "${clarificationQuestion || 'Could you elaborate on your current traction metrics?'}"
          </blockquote>
          <p>Simply reply directly to this email with your thoughts and we will continue the review.</p>
          <p>Best regards,<br/>The Venturizer Team</p>
        </div>
      `;
      break;

    case 'low':
    default:
      subject = 'Your application to Venturizer';
      html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #16213a;">
          <h2>Hi ${name},</h2>
          <p>Thank you for taking the time to share your details with Venturizer.</p>
          <p>After reviewing your responses, we regret to inform you that we are unable to proceed with your application at this time as it does not align with our current investment focus.</p>
          <p>We wish you the absolute best in your startup journey.</p>
          <p>Best regards,<br/>The Venturizer Team</p>
        </div>
      `;
      break;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`⚠️ Resend API returned error (Sandbox limit or invalid domain): ${errText}`);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('❌ Failed to send email via Resend:', err.message);
    return false;
  }
}

/**
 * Sends a real-time notification to Discord for Hot leads.
 */
export async function sendDiscordHotAlert(
  name: string,
  flowType: string,
  score: number,
  aiSummary: string
): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('⚠️ DISCORD_WEBHOOK_URL is not configured. Skipping alert.');
    return false;
  }

  const payload = {
    embeds: [
      {
        title: '🔥 Hot Lead Qualified!',
        color: 15876157, // Hex #F2403D (Momentum Coral)
        fields: [
          { name: 'Name', value: name || 'Anonymous', inline: true },
          { name: 'Flow Type', value: flowType === 'founder' ? 'Founder' : 'Investor', inline: true },
          { name: 'Score', value: `${score} / 100`, inline: true },
          { name: 'AI Summary', value: aiSummary || 'No AI summary generated.' },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`⚠️ Discord webhook returned HTTP ${res.status}: ${await res.text()}`);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('❌ Failed to fire Discord webhook alert:', err.message);
    return false;
  }
}
