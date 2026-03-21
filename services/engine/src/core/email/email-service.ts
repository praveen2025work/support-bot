import { logger } from "@/lib/logger";

/**
 * Org email REST API integration.
 * Uses the internal email service (NOT nodemailer).
 *
 * Service URL: configured via EMAIL_API_URL env var
 * Request Type: POST
 */

const EMAIL_API_URL = process.env.EMAIL_API_URL || "";
const EMAIL_FROM =
  process.env.EMAIL_FROM_ADDRESS || "chatbot-noreply@company.com";
const EMAIL_REQUESTED_BY = process.env.EMAIL_REQUESTED_BY || "chatbot-system";

export interface SendEmailParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  files?: string[];
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!EMAIL_API_URL) {
    logger.warn("EMAIL_API_URL not configured — skipping email send");
    return false;
  }

  const body = {
    requestedby: EMAIL_REQUESTED_BY,
    fromaddress: EMAIL_FROM,
    toaddress: params.to,
    ccaddress: params.cc || [],
    bccaddress: params.bcc || [],
    subject: params.subject,
    htmlbodyflag: true,
    body: params.htmlBody,
    files: params.files || [],
  };

  try {
    const res = await fetch(EMAIL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "no body");
      logger.error({ status: res.status, text }, "Email API returned error");
      return false;
    }

    logger.info(
      { to: params.to, subject: params.subject },
      "Email sent successfully",
    );
    return true;
  } catch (err) {
    logger.error({ error: (err as Error).message }, "Email API request failed");
    return false;
  }
}
