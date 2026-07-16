import { NextResponse } from "next/server";
import { z } from "zod";
import { saveSubmission } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";
import type { EligibilityResult } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  result: z.custom<EligibilityResult>(),
  contactMessage: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  yearsSinceClaim: z.string().optional(),
  claimScenarios: z
    .array(z.enum(["still_cold", "new_owner", "incomplete_install", "other"]))
    .optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }

    const payload = parsed.data;

    if (payload.result.eeca.hasExistingClaim) {
      if (!payload.contactMessage?.trim()) {
        return NextResponse.json(
          { error: "Please describe the circumstances around your inquiry." },
          { status: 400 }
        );
      }
      if (!payload.yearsSinceClaim?.trim()) {
        return NextResponse.json(
          { error: "Please tell us how long it has been since the last claim." },
          { status: 400 }
        );
      }
      if (!payload.claimScenarios?.length) {
        return NextResponse.json(
          { error: "Please select at least one situation that matches your inquiry." },
          { status: 400 }
        );
      }
    }

    const email = await sendNotificationEmail(payload);
    const saved = saveSubmission(payload, email.status);

    return NextResponse.json({
      ok: true,
      submissionId: saved.id,
      email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
