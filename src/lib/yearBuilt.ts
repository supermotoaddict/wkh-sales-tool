export type YearBuiltSource = "homes.co.nz" | "manual" | "unknown";

export type YearBuiltConfidence = "high" | "low" | "none";

export interface YearBuiltLookup {
  found: boolean;
  decadeBuilt: number | null;
  /** Derived from decade: true if clearly before 2008, false if clearly 2008+, null if unknown. */
  builtBefore2008: boolean | null;
  confidence: YearBuiltConfidence;
  summary: string | null;
  propertyId: string | null;
  source: YearBuiltSource;
  error?: string;
}

/**
 * Map homes.co.nz decade_built to WKH "built before 2008" answer.
 * Decades are typically 10-year buckets (e.g. 1990, 2000, 2010).
 * - <= 2000 → before 2008
 * - >= 2010 → 2008 or later
 * - anything else / missing → unknown (ask user)
 */
export function builtBefore2008FromDecade(
  decade: number | null | undefined
): { builtBefore2008: boolean | null; confidence: YearBuiltConfidence; summary: string | null } {
  if (decade == null || Number.isNaN(decade)) {
    return { builtBefore2008: null, confidence: "none", summary: null };
  }

  if (decade <= 2000) {
    return {
      builtBefore2008: true,
      confidence: "high",
      summary: `Property records show this home was built in the ${decade}s.`,
    };
  }

  if (decade >= 2010) {
    return {
      builtBefore2008: false,
      confidence: "high",
      summary: `Property records show this home was built in the ${decade}s (2008 or later).`,
    };
  }

  // Unexpected mid values — treat cautiously
  return {
    builtBefore2008: null,
    confidence: "low",
    summary: `Property records show decade built as ${decade}. Please confirm.`,
  };
}

/**
 * Look up decade built via homes.co.nz unofficial property APIs.
 * Only call after an address is selected — never on every keystroke.
 */
export async function lookupYearBuilt(addressLabel: string): Promise<YearBuiltLookup> {
  const empty: YearBuiltLookup = {
    found: false,
    decadeBuilt: null,
    builtBefore2008: null,
    confidence: "none",
    summary: null,
    propertyId: null,
    source: "unknown",
  };

  const trimmed = addressLabel.trim();
  if (!trimmed) return { ...empty, error: "Address is required" };

  try {
    const resolveUrl = new URL("https://gateway.homes.co.nz/property/resolve");
    resolveUrl.searchParams.set("address", trimmed);

    const resolveRes = await fetch(resolveUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "WKH-Sales-Tool/1.0",
      },
      next: { revalidate: 0 },
    });

    if (!resolveRes.ok) {
      return { ...empty, error: `Address resolve failed (${resolveRes.status})`, source: "homes.co.nz" };
    }

    const resolved = (await resolveRes.json()) as { property_id?: string; error?: string };
    const propertyId = resolved.property_id || null;
    if (!propertyId) {
      return {
        ...empty,
        found: false,
        source: "homes.co.nz",
        error: resolved.error || "No property match found",
      };
    }

    const detailsUrl = new URL("https://api-gateway.homes.co.nz/details");
    detailsUrl.searchParams.set("property_id", propertyId);

    const detailsRes = await fetch(detailsUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "WKH-Sales-Tool/1.0",
      },
      next: { revalidate: 0 },
    });

    if (!detailsRes.ok) {
      return {
        ...empty,
        propertyId,
        source: "homes.co.nz",
        error: `Property details failed (${detailsRes.status})`,
      };
    }

    const details = (await detailsRes.json()) as {
      property?: { decade_built?: string | number | null };
      error?: string;
    };

    const rawDecade = details.property?.decade_built;
    const decadeBuilt =
      rawDecade == null || rawDecade === ""
        ? null
        : Math.round(Number(rawDecade));

    const derived = builtBefore2008FromDecade(
      decadeBuilt != null && !Number.isNaN(decadeBuilt) ? decadeBuilt : null
    );

    return {
      found: derived.builtBefore2008 != null,
      decadeBuilt: decadeBuilt != null && !Number.isNaN(decadeBuilt) ? decadeBuilt : null,
      builtBefore2008: derived.builtBefore2008,
      confidence: derived.confidence,
      summary: derived.summary,
      propertyId,
      source: "homes.co.nz",
      error: details.error || undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Year-built lookup failed";
    return { ...empty, error: message, source: "homes.co.nz" };
  }
}
