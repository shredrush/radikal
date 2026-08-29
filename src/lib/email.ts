import { after } from "next/server";
import { Resend } from "resend";

const SITE_NAME = "Radikal";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Resend requires the sender to be a verified domain. While developing, the
// shared "onboarding@resend.dev" address works with a test API key. Point this
// at your own verified domain (e.g. "Radikal <trips@radikal.in>") in production.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? `Radikal <onboarding@resend.dev>`;

// TEMPORARY test redirect: while developing, any email addressed to a
// @example.com or @radikal.in recipient is routed to the developer's inbox
// instead, so real test accounts can be exercised without owning those domains.
const TEST_REDIRECT_TO = "shredrush@gmail.com";
const TEST_REDIRECT_DOMAINS = new Set(["example.com", "radikal.in"]);

function redirectTestEmail(to: string): string {
  const at = to.lastIndexOf("@");
  if (at === -1) return to;
  const domain = to.slice(at + 1).trim().toLowerCase();
  if (TEST_REDIRECT_DOMAINS.has(domain)) {
    return TEST_REDIRECT_TO;
  }
  return to;
}

// Branding used by the plain-HTML email templates below.
const BRAND = "#18181b";
const MUTED = "#71717a";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMultiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

function siteUrl(path = ""): string {
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatRupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 40px;">
                <p style="margin:0 0 24px;font-size:20px;font-weight:700;letter-spacing:-0.01em;">${SITE_NAME}</p>
                ${bodyHtml}
                <p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #e4e4e7;font-size:12px;color:${MUTED};line-height:1.6;">
                  You received this email because you have an account with ${SITE_NAME}.<br />
                  If you did not expect this, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;line-height:1.3;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">${text}</p>`;
}

function button(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:8px 0 16px;padding:12px 20px;background:${BRAND};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(label)}</a>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:${MUTED};">${escapeHtml(label)}</td>
    <td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;color:${BRAND};">${escapeHtml(value)}</td>
  </tr>`;
}

function detailTable(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-top:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;">${rows
    .map(([label, value]) => detailRow(label, value))
    .join("")}</table>`;
}

export type EmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Sends a single transactional email. Never throws — email failures are logged
 * so a broken email provider can't take down a booking, signup, or payment.
 */
export async function sendEmail(input: EmailInput): Promise<boolean> {
  if (!input.to) return false;

  const client = getResend();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${input.subject}"`);
    return false;
  }

  const recipient = redirectTestEmail(input.to);
  if (recipient !== input.to) {
    console.log(`[email] test redirect: "${input.to}" -> "${recipient}"`);
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: recipient,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    });

    if (error) {
      console.error(`[email] failed to send "${input.subject}"`, error);
      return false;
    }

    return Boolean(data?.id);
  } catch (error) {
    console.error(`[email] failed to send "${input.subject}"`, error);
    return false;
  }
}

/**
 * Schedules an email to be sent after the current response finishes, so the
 * user-facing action (signup, booking, payment, ...) is never blocked on email
 * delivery. Use this from Server Actions.
 */
export function sendEmailAfter(input: EmailInput): void {
  if (!input.to) return;

  after(async () => {
    await sendEmail(input);
  });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function welcomeEmail({ to, name }: { to: string; name: string }): EmailInput {
  const displayName = name || "there";
  return {
    to,
    subject: `Welcome to ${SITE_NAME}!`,
    html: layout(
      `Welcome to ${SITE_NAME}!`,
      heading(`Welcome, ${escapeHtml(displayName)}!`) +
        paragraph(
          `Thanks for joining ${SITE_NAME}. Your account is ready — browse trips, book an adventure, and, when you're ready, apply to lead trips as a certified guide.`,
        ) +
        button(siteUrl("/trips"), "Browse trips"),
    ),
  };
}

export function paymentReferenceReceivedEmail({
  to,
  name,
  tripTitle,
  location,
  date,
  participantCount,
  totalPriceRupees,
  transactionId,
}: {
  to: string;
  name: string;
  tripTitle: string;
  location: string;
  date: Date;
  participantCount: number;
  totalPriceRupees: number;
  transactionId: string;
}): EmailInput {
  return {
    to,
    subject: `Booking & payment received: ${tripTitle}`,
    html: layout(
      "Booking & payment received",
      heading(`Thanks, ${escapeHtml(name || "there")}!`) +
        paragraph(
          `We've received your booking request and payment reference for <strong>${escapeHtml(tripTitle)}</strong>. Your spots are held while our team verifies the transfer.`,
        ) +
        detailTable([
          ["Trip", tripTitle],
          ["Location", location],
          ["Date", formatDate(date)],
          ["Participants", String(participantCount)],
          ["Total", formatRupees(totalPriceRupees)],
          ["Transaction ID", transactionId],
        ]) +
        paragraph(
          `Our team will verify your transfer of <strong>${formatRupees(totalPriceRupees)}</strong> and confirm your booking shortly.`,
        ) +
        button(siteUrl("/profile"), "View booking"),
    ),
  };
}

export function bookingConfirmedEmail({
  to,
  name,
  tripTitle,
  location,
  date,
  participantCount,
  totalPriceRupees,
}: {
  to: string;
  name: string;
  tripTitle: string;
  location: string;
  date: Date;
  participantCount: number;
  totalPriceRupees: number;
}): EmailInput {
  return {
    to,
    subject: `Booking confirmed: ${tripTitle}`,
    html: layout(
      "You're booked!",
      heading(`You're going to ${escapeHtml(tripTitle)}!`) +
        paragraph(
          `Great news, ${escapeHtml(name || "there")} — your payment has been confirmed and your booking is locked in.`,
        ) +
        detailTable([
          ["Trip", tripTitle],
          ["Location", location],
          ["Date", formatDate(date)],
          ["Participants", String(participantCount)],
          ["Total", formatRupees(totalPriceRupees)],
        ]) +
        button(siteUrl("/profile"), "View booking"),
    ),
  };
}

export function bookingCancelledEmail({
  to,
  name,
  tripTitle,
  date,
  cancelledByUser,
}: {
  to: string;
  name: string;
  tripTitle: string;
  date: Date;
  cancelledByUser: boolean;
}): EmailInput {
  const message = cancelledByUser
    ? `Your booking for <strong>${escapeHtml(tripTitle)}</strong> has been cancelled as requested.`
    : `Your booking for <strong>${escapeHtml(tripTitle)}</strong> has been cancelled by our team.`;

  return {
    to,
    subject: `Booking cancelled: ${tripTitle}`,
    html: layout(
      "Booking cancelled",
      heading("Booking cancelled") +
        paragraph(`Hi ${escapeHtml(name || "there")}, ${message}`) +
        detailTable([
          ["Trip", tripTitle],
          ["Date", formatDate(date)],
        ]) +
        paragraph(
          `If this was a mistake or you'd like to rebook, just reply to this email or reach out through support.`,
        ) +
        button(siteUrl("/trips"), "Browse trips"),
    ),
  };
}

export function passwordResetOtpEmail({
  to,
  name,
  code,
}: {
  to: string;
  name: string;
  code: string;
}): EmailInput {
  return {
    to,
    subject: `Your ${SITE_NAME} password reset code`,
    html: layout(
      "Reset your password",
      heading("Reset your password") +
        paragraph(
          `Hi ${escapeHtml(name || "there")}, use the one-time code below to reset your ${SITE_NAME} password:`,
        ) +
        `<p style="margin:0 0 16px;padding:16px 20px;background:#f4f4f5;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:0.4em;text-align:center;color:${BRAND};">${escapeHtml(code)}</p>` +
        paragraph(
          `This code expires in 5 minutes and can only be used once. If you didn't request a password reset, you can safely ignore this email — your password won't change.`,
        ),
    ),
  };
}

export function passwordChangedEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}): EmailInput {
  return {
    to,
    subject: `Your ${SITE_NAME} password was changed`,
    html: layout(
      "Password changed",
      heading("Your password was changed") +
        paragraph(
          `Hi ${escapeHtml(name || "there")}, your ${SITE_NAME} account password was just changed. If this was you, no further action is needed.`,
        ) +
        paragraph(
          `If you did not make this change, please reset your password immediately and contact support.`,
        ),
    ),
  };
}

export function guideApplicationReceivedEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}): EmailInput {
  return {
    to,
    subject: "We received your guide application",
    html: layout(
      "Application received",
      heading(`Thanks for applying, ${escapeHtml(name || "there")}!`) +
        paragraph(
          `We've received your application to become a ${SITE_NAME} guide. Our team will review your certifications and experience, and we'll be in touch with a decision soon.`,
        ),
    ),
  };
}

export function guideApplicationDecisionEmail({
  to,
  name,
  approved,
}: {
  to: string;
  name: string;
  approved: boolean;
}): EmailInput {
  const body = approved
    ? `Great news — your guide application has been <strong>approved</strong>! You can now lead trips on ${SITE_NAME}.`
    : `Thanks for your interest in becoming a ${SITE_NAME} guide. Unfortunately, your application wasn't approved this time. Feel free to apply again in the future.`;

  return {
    to,
    subject: approved ? "Your guide application was approved" : "Update on your guide application",
    html: layout(
      approved ? "Application approved" : "Application update",
      heading(approved ? "You're approved!" : "Update on your application") +
        paragraph(`Hi ${escapeHtml(name || "there")},`) +
        paragraph(body),
    ),
  };
}

export function guideWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}): EmailInput {
  return {
    to,
    subject: `You're now a ${SITE_NAME} guide!`,
    html: layout(
      "You're now a guide",
      heading(`Welcome to the team, ${escapeHtml(name || "there")}!`) +
        paragraph(
          `You've been added as a guide on ${SITE_NAME}. Your profile is now live on the community page, and travellers can discover and book your trips.`,
        ) +
        button(siteUrl("/community"), "View the community"),
    ),
  };
}

export function supportReplyEmail({
  to,
  name,
  reply,
}: {
  to: string;
  name: string;
  reply: string;
}): EmailInput {
  return {
    to,
    subject: "New reply to your support message",
    html: layout(
      "Support reply",
      heading("We replied to your support message") +
        paragraph(
          `Hi ${escapeHtml(name || "there")}, a member of our support team replied to your conversation:`,
        ) +
        `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #e4e4e7;background:#fafafa;font-size:14px;line-height:1.6;color:#3f3f46;">${escapeMultiline(reply)}</blockquote>` +
        button(siteUrl("/profile?tab=support"), "View conversation"),
    ),
  };
}

export function tripChangeSubmittedAdminEmail({
  to,
  name,
  guideName,
  tripTitle,
  changeId,
}: {
  to: string;
  name: string;
  guideName: string;
  tripTitle: string;
  changeId: string;
}): EmailInput {
  return {
    to,
    subject: `A guide trip change needs your review`,
    html: layout(
      "Trip change needs review",
      heading(`New trip change from ${escapeHtml(guideName)}`) +
        paragraph(
          `Hi ${escapeHtml(name || "there")}, ${escapeHtml(guideName)} submitted a change for “${escapeHtml(tripTitle)}” that needs your review before it goes live.`,
        ) +
        button(siteUrl(`/admin/trip-changes#change-${changeId}`), "Review changes"),
    ),
  };
}

export function guideCancelledBookingAdminEmail({
  to,
  name,
  guideName,
  tripTitle,
  participantCount,
}: {
  to: string;
  name: string;
  guideName: string;
  tripTitle: string;
  participantCount: number;
}): EmailInput {
  const bookingsText =
    participantCount === 1 ? "a booking" : `${participantCount} bookings`;

  return {
    to,
    subject: `A guide cancelled a booking for ${tripTitle}`,
    html: layout(
      "Booking cancelled by guide",
      heading(`${escapeHtml(guideName)} cancelled a trip booking`) +
        paragraph(
          `Hi ${escapeHtml(name || "there")}, ${escapeHtml(guideName)} cancelled ${bookingsText} for “${escapeHtml(tripTitle)}”. The traveller was notified and the cancelled reservation now sits in the cancelled bookings view.`,
        ) +
        button(siteUrl("/admin/bookings"), "View bookings"),
    ),
  };
}

export function tripChangeDecisionEmail({
  to,
  name,
  approved,
  tripTitle,
}: {
  to: string;
  name: string;
  approved: boolean;
  tripTitle: string;
}): EmailInput {
  const body = approved
    ? `Good news — your trip change for “${escapeHtml(tripTitle)}” was <strong>approved</strong> and is now live on ${SITE_NAME}.`
    : `Your trip change for “${escapeHtml(tripTitle)}” was <strong>rejected</strong>. You can review the details and submit a revised change from your profile.`;

  return {
    to,
    subject: approved ? "Your trip change was approved" : "Update on your trip change",
    html: layout(
      approved ? "Trip change approved" : "Trip change update",
      heading(approved ? "Your change is live!" : "Update on your trip change") +
        paragraph(`Hi ${escapeHtml(name || "there")},`) +
        paragraph(body) +
        button(siteUrl("/guide-board/trips"), "View my trips"),
    ),
  };
}
