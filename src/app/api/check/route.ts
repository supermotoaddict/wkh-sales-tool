import { NextResponse } from "next/server";
import { z } from "zod";
import { getAddressDetails } from "@/lib/address";
import { checkEecaEligibility } from "@/lib/eeca";
import { evaluateEligibility } from "@/lib/eligibility";
import { lookupNzDep } from "@/lib/nzdep";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  address: z.object({ id: z.string().min(1), label: z.string().min(1) }),
  occupancy: z.enum(["owner", "rental"]),
  builtBefore2008: z.boolean(),
  hasCommunityServicesCard: z.boolean(),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const answers = parsed.data;

    // Early exits that don't need external lookups
    if (answers.occupancy === "rental" || !answers.builtBefore2008) {
      const result = evaluateEligibility({
        answers,
        nzDep: null,
        eeca: {
          checked: false,
          hasExistingClaim: false,
          hasInsulationRequest: false,
          hasHeatingRequest: false,
          hasInsulation: false,
          hasHeating: false,
          addressInsulationValid: null,
          addressHeatingValid: null,
          claimSummary: null,
        },
      });
      return NextResponse.json({ result });
    }

    const details = await getAddressDetails(answers.address.id);

    const [nzDep, eeca] = await Promise.all([
      lookupNzDep(details.lat, details.lon),
      checkEecaEligibility(answers.address.id),
    ]);

    const result = evaluateEligibility({ answers, nzDep, eeca });
    return NextResponse.json({
      result: {
        ...result,
        answers: {
          ...result.answers,
          addressLabel: details.label || result.answers.addressLabel,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eligibility check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
