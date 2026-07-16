import type { EligibilityResult, EecaResult, FormAnswers, NzDepResult } from "./types";

/**
 * Funding bands for Warmer Kiwi Homes (area-based), when no Community Services Card:
 * NZDep 5–7 → 50%, 8 → 80%, 9–10 → 90%. Deciles 1–4 are not area-eligible.
 * A Community Services Card qualifies for the maximum 90% regardless of NZDep.
 */
export function fundingFromDecile(decile: number | null | undefined): number | null {
  if (decile == null || Number.isNaN(decile)) return null;
  if (decile >= 9) return 90;
  if (decile === 8) return 80;
  if (decile >= 5) return 50;
  return null;
}

export function evaluateEligibility(input: {
  answers: Pick<
    FormAnswers,
    "address" | "occupancy" | "builtBefore2008" | "hasCommunityServicesCard"
  >;
  nzDep: NzDepResult | null;
  eeca: EecaResult;
}): EligibilityResult {
  const { answers, nzDep, eeca } = input;
  const base = {
    nzDep,
    eeca,
    answers: {
      addressLabel: answers.address.label,
      addressId: answers.address.id,
      occupancy: answers.occupancy,
      builtBefore2008: answers.builtBefore2008,
      hasCommunityServicesCard: answers.hasCommunityServicesCard,
    },
    checkedAt: new Date().toISOString(),
  };

  if (answers.occupancy === "rental") {
    return {
      ...base,
      eligible: false,
      fundingPercent: null,
      fundingReason: "Rental properties are not eligible for Warmer Kiwi Homes.",
      ineligibleReason:
        "This programme is only available for owner-occupied homes. Rental properties do not qualify.",
    };
  }

  if (!answers.builtBefore2008) {
    return {
      ...base,
      eligible: false,
      fundingPercent: null,
      fundingReason: "Homes built in 2008 or later are not eligible.",
      ineligibleReason:
        "Your home must have been built before 2008 to qualify for a Warmer Kiwi Homes grant.",
    };
  }

  if (answers.hasCommunityServicesCard) {
    return {
      ...base,
      eligible: true,
      fundingPercent: 90,
      fundingReason:
        "A Community Services Card (or SuperGold Combo Card) qualifies you for the maximum 90% government funding, regardless of NZDep zone.",
    };
  }

  const decile = nzDep?.decile ?? null;
  const funding = fundingFromDecile(decile);

  if (funding == null) {
    return {
      ...base,
      eligible: false,
      fundingPercent: null,
      fundingReason:
        decile == null
          ? "We could not determine the NZDep2023 decile for this address."
          : `NZDep2023 decile ${decile} is outside the funded zones (5–10) and no Community Services Card was provided.`,
      ineligibleReason:
        decile == null
          ? "We could not look up the deprivation zone for this address. Please try again or contact us."
          : `Without a Community Services Card, only homes in NZDep zones 5–10 qualify. Your SA1 is in zone ${decile}.`,
    };
  }

  return {
    ...base,
    eligible: true,
    fundingPercent: funding,
    fundingReason: `Based on NZDep2023 decile ${decile} (SA1 ${nzDep?.sa1Code ?? "unknown"}), government funding is ${funding}%.`,
  };
}
