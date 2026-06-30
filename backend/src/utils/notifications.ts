import { ScoringResult } from './scoring';

export interface EmailPayload {
  to: string;
  name: string;
  score: number;
  bucket: string;
  clarificationQuestion?: string;
  templateOverride?: string;
  customMessage?: string;
  leadId?: string;
}

/**
 * Sends a bucket-specific email to the lead using the Brevo (Sendinblue) API.
 */
export async function sendBucketEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ BREVO_API_KEY is not configured. Skipping email.');
    return false;
  }

  const { to, name, score, bucket, clarificationQuestion, templateOverride, customMessage, leadId } = payload;
  let subject = '';
  let html = '';

  const fromEmail = process.env.EMAIL_FROM || 'hello@dealflow.ai';
  const activeTemplate = templateOverride || bucket;

  const calUrl = process.env.CALCOM_EVENT_URL || 'https://cal.com/hirdyansh-kumar/30min';

  if (activeTemplate === 'custom') {
    subject = 'Update regarding your DealFlow AI application';
    html = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #16213a;">
        <h2>Hi ${name},</h2>
        <div style="white-space: pre-wrap; margin: 20px 0; font-size: 15px; color: #16213a; font-family: sans-serif;">${customMessage || ''}</div>
        <p>Best regards,<br/>The DealFlow AI Team</p>
      </div>
    `;
  } else {
    switch (activeTemplate) {
      case 'hot':
        subject = 'Your application to DealFlow AI - Next Steps';
        html = `
          <div style="font-family: sans-serif; line-height: 1.5; color: #16213a;">
            <h2 style="color: #1f4294;">Hi ${name},</h2>
            <p>Thank you for submitting your details to DealFlow AI.</p>
            <p>We are thrilled to let you know that your profile fits our investment criteria perfectly! We would love to schedule an introductory call to discuss program details.</p>
            <p><strong>Please book a slot directly on our calendar here:</strong></p>
            <p><a href="${calUrl}?metadata[leadId]=${leadId || ''}" style="display: inline-block; padding: 10px 20px; background-color: #f2403d; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">Book Call Slot</a></p>
            <p>Best regards,<br/>The DealFlow AI Team</p>
          </div>
        `;
        break;

      case 'good':
        subject = 'Your application to DealFlow AI';
        html = `
          <div style="font-family: sans-serif; line-height: 1.5; color: #16213a;">
            <h2>Hi ${name},</h2>
            <p>Thank you for sharing details about your startup.</p>
            <p>We have received your responses and our investment team is currently reviewing them. We will get back to you with next steps within the next 3-5 business days.</p>
            <p>Best regards,<br/>The DealFlow AI Team</p>
          </div>
        `;
        break;

      case 'maybe':
        subject = 'Follow-up regarding your DealFlow AI application';
        html = `
          <div style="font-family: sans-serif; line-height: 1.5; color: #16213a;">
            <h2>Hi ${name},</h2>
            <p>Thank you for applying to DealFlow AI.</p>
            <p>We reviewed your responses and had a quick follow-up question to help us better evaluate fit:</p>
            <blockquote style="border-left: 4px solid #d98e3f; padding-left: 15px; margin: 20px 0; color: #594f45; font-style: italic;">
              "${clarificationQuestion || 'Could you elaborate on your current traction metrics?'}"
            </blockquote>
            <p>Simply reply directly to this email with your thoughts and we will continue the review.</p>
            <p>Best regards,<br/>The DealFlow AI Team</p>
          </div>
        `;
        break;

      case 'low':
      default:
        subject = 'Your application to DealFlow AI';
        html = `
          <div style="font-family: sans-serif; line-height: 1.5; color: #16213a;">
            <h2>Hi ${name},</h2>
            <p>Thank you for taking the time to share your details with DealFlow AI.</p>
            <p>After reviewing your responses, we regret to inform you that we are unable to proceed with your application at this time as it does not align with our current investment focus.</p>
            <p>We wish you the absolute best in your startup journey.</p>
            <p>Best regards,<br/>The DealFlow AI Team</p>
          </div>
        `;
        break;
    }
  }

  console.log(`📧 Attempting to send email via Brevo to: ${to}...`);
  console.log(`   [Brevo Payload] From: ${fromEmail}, Subject: "${subject}"`);

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'DealFlow AI', email: fromEmail },
        to: [{ email: to, name: name }],
        subject: subject,
        htmlContent: html,
      }),
    });

    const responseText = await res.text();
    console.log(`📧 Brevo API Response Code: ${res.status}`);
    console.log(`📧 Brevo API Response Body: ${responseText}`);

    if (!res.ok) {
      console.warn(`⚠️ Brevo API returned error: ${res.status} - ${responseText}`);
      return false;
    }

    console.log(`📧 Brevo Email sent successfully to ${to}.`);
    return true;
  } catch (err: any) {
    console.error('❌ Brevo email invocation failed with exception:', err.stack || err);
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
  aiSummary: string,
  leadId: string
): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('⚠️ DISCORD_WEBHOOK_URL is not configured. Skipping alert.');
    return false;
  }

  const dashboardBaseUrl = process.env.FRONTEND_URL || process.env.DASHBOARD_BASE_URL || 'http://localhost:5173';
  const checkNowUrl = `${dashboardBaseUrl}/admin/leads/${leadId}`;

  const payload = {
    embeds: [
      {
        title: `🔥 Hot Lead: ${name || 'Anonymous'}`,
        description: aiSummary || 'No AI summary generated.',
        url: checkNowUrl,
        color: 15876157, // Hex #F2403D (Momentum Coral)
        fields: [
          { name: 'Flow Type', value: flowType === 'founder' ? 'Founder' : 'Investor', inline: true },
          { name: 'Score', value: `${score} / 100`, inline: true },
          { name: 'Triage Panel', value: `[Check now →](${checkNowUrl})`, inline: false }
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  console.log(`👾 Attempting to post to Discord webhook: ${webhookUrl.substring(0, 40)}...`);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    console.log(`👾 Discord webhook response code: ${res.status}`);
    if (responseText) {
      console.log(`👾 Discord webhook response body: ${responseText}`);
    }

    if (!res.ok) {
      console.warn(`⚠️ Discord webhook returned HTTP ${res.status}: ${responseText}`);
      return false;
    }

    console.log('👾 Discord webhook notification posted successfully.');
    return true;
  } catch (err: any) {
    console.error('❌ Discord webhook invocation failed with exception:', err.stack || err);
    return false;
  }
}

/**
 * Sends a real-time notification to Discord when a meeting is booked via Cal.com.
 */
export async function sendDiscordBookingAlert(
  name: string,
  meetingLink: string,
  scheduledTime: string,
  leadId: string
): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('⚠️ DISCORD_WEBHOOK_URL is not configured. Skipping alert.');
    return false;
  }

  const dashboardBaseUrl = process.env.FRONTEND_URL || process.env.DASHBOARD_BASE_URL || 'http://localhost:5173';
  const checkNowUrl = `${dashboardBaseUrl}/admin/leads/${leadId}`;

  const payload = {
    embeds: [
      {
        title: `📅 Meeting Booked: ${name || 'Anonymous'}`,
        description: 'An introductory call slot has been successfully scheduled via Cal.com.',
        color: 3066993, // Hex #2ECC71 (Green)
        fields: [
          { name: 'Scheduled Time', value: scheduledTime || 'N/A', inline: true },
          { name: 'Video Call Link', value: meetingLink ? `[Join Meeting](${meetingLink})` : 'N/A', inline: true },
          { name: 'Triage Panel', value: `[Check now →](${checkNowUrl})`, inline: false }
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  console.log(`👾 Attempting to post meeting scheduled to Discord: ${webhookUrl.substring(0, 40)}...`);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err: any) {
    console.error('❌ Failed to post booking alert to Discord:', err.stack || err);
    return false;
  }
}
