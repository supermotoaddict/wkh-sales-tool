import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import type { SubmissionPayload } from "./types";

const NOTIFY_TO = process.env.NOTIFY_EMAIL ?? "insulator.dan@gmail.com";
const OUTBOX_DIR = path.join(process.cwd(), "data", "outbox");

const SCENARIO_LABELS: Record<string, string> = {
  still_cold: "House still feels cold / insulation may be incomplete",
  new_owner: "New owner — previous owner may have claimed",
  incomplete_install: "Installer may have missed a component",
  other: "Other",
};

function buildEmailContent(payload: SubmissionPayload): { subject: string; text: string; html: string } {
  const { result } = payload;
  const funding =
    result.fundingPercent != null ? `${result.fundingPercent}%` : "N/A";
  const claim = result.eeca.hasExistingClaim ? "YES — existing claim / insulation on record" : "No";
  const claimTag = result.eeca.hasExistingClaim ? "EXISTING CLAIM" : result.eligible ? "ELIGIBLE" : "NOT ELIGIBLE";

  const subject = `WKH eligibility: ${claimTag} — ${result.answers.addressLabel}`;

  const lines = [
    "Warmer Kiwi Homes — Eligibility check result",
    "============================================",
    "",
    `Checked at: ${result.checkedAt}`,
    `Address: ${result.answers.addressLabel}`,
    `Address ID: ${result.answers.addressId}`,
    "",
    `Occupancy: ${result.answers.occupancy}`,
    `Built before 2008: ${result.answers.builtBefore2008 ? "Yes" : "No"}`,
    `Community Services Card: ${result.answers.hasCommunityServicesCard ? "Yes" : "No"}`,
    "",
    `Eligible (rules check): ${result.eligible ? "Yes" : "No"}`,
    `Government funding discount: ${funding}`,
    `Funding reason: ${result.fundingReason}`,
    result.ineligibleReason ? `Ineligible reason: ${result.ineligibleReason}` : "",
    "",
    `NZDep2023 decile: ${result.nzDep?.decile ?? "unknown"}`,
    `SA1 code: ${result.nzDep?.sa1Code ?? "unknown"}`,
    `SA2 name: ${result.nzDep?.sa2Name ?? "unknown"}`,
    "",
    `Existing EECA claim / prior insulation: ${claim}`,
    `  hasInsulation (ceiling & underfloor on record): ${result.eeca.hasInsulation}`,
    `  hasHeating on record: ${result.eeca.hasHeating}`,
    `  Insulation request open: ${result.eeca.hasInsulationRequest}`,
    `  Heating request open: ${result.eeca.hasHeatingRequest}`,
    result.eeca.claimSummary ? `  EECA message: ${result.eeca.claimSummary}` : "",
    `  EECA check completed: ${result.eeca.checked}`,
    result.eeca.error ? `  EECA error: ${result.eeca.error}` : "",
    "",
    `Years / time since last claim: ${payload.yearsSinceClaim || "—"}`,
    `Claim scenario: ${
      payload.claimScenario
        ? SCENARIO_LABELS[payload.claimScenario] || payload.claimScenario
        : "—"
    }`,
    "",
    `Contact name: ${payload.contactName || "—"}`,
    `Contact email: ${payload.contactEmail || "—"}`,
    `Contact phone: ${payload.contactPhone || "—"}`,
    "",
    "Circumstances / contact message:",
    payload.contactMessage || "(none)",
  ]
    .filter((l) => l !== "")
    .join("\n");

  const html = `<pre style="font-family:ui-monospace,monospace;font-size:14px;line-height:1.5">${lines
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>`;

  return { subject, text: lines, html };
}

async function writeOutbox(payload: SubmissionPayload, content: { subject: string; text: string }) {
  if (!fs.existsSync(OUTBOX_DIR)) fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(OUTBOX_DIR, `${stamp}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({ to: NOTIFY_TO, ...content, payload }, null, 2),
    "utf8"
  );
  return file;
}

/**
 * Sends notification email. Priority:
 * 1. RESEND_API_KEY (free tier at resend.com)
 * 2. SMTP_HOST / SMTP_USER / SMTP_PASS
 * 3. Local outbox JSON under data/outbox (always written as backup)
 */
export async function sendNotificationEmail(
  payload: SubmissionPayload
): Promise<{ status: string; detail: string }> {
  const content = buildEmailContent(payload);
  const outboxPath = await writeOutbox(payload, content);

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const from = process.env.RESEND_FROM ?? "WKH Checker <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [NOTIFY_TO],
        subject: content.subject,
        text: content.text,
        html: content.html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return {
        status: "outbox_only",
        detail: `Resend failed (${res.status}): ${err}. Saved to ${outboxPath}`,
      };
    }
    return { status: "sent_resend", detail: `Sent via Resend to ${NOTIFY_TO}` };
  }

  const host = process.env.SMTP_HOST;
  if (host) {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "wkh-checker@localhost",
      to: NOTIFY_TO,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    return { status: "sent_smtp", detail: `Sent via SMTP to ${NOTIFY_TO}` };
  }

  return {
    status: "outbox_only",
    detail: `No RESEND_API_KEY or SMTP configured. Email saved to ${outboxPath} (would go to ${NOTIFY_TO}).`,
  };
}
