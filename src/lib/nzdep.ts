import type { NzDepResult } from "./types";

const SA1_LAYER =
  "https://services6.arcgis.com/ZVM1rEuVZjtC1Wwk/arcgis/rest/services/New_Zealand_Index_of_Deprivation_2023_WFL1/FeatureServer/0/query";

/**
 * Looks up NZDep2023 decile for a WGS84 point via the public Massey / EHINZ ArcGIS layer
 * (same dataset as https://massey.maps.arcgis.com/... NZDep2023 map).
 */
export async function lookupNzDep(lat: number, lon: number): Promise<NzDepResult> {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "SA12023_code,SA12023_V1,NZDep2023,SA22023_name",
    returnGeometry: "false",
    f: "json",
  });

  const res = await fetch(`${SA1_LAYER}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`NZDep lookup failed (${res.status})`);
  }

  const data = (await res.json()) as {
    error?: { message?: string };
    features?: Array<{
      attributes?: {
        SA12023_code?: string;
        SA12023_V1?: string;
        NZDep2023?: number | null;
        SA22023_name?: string | null;
      };
    }>;
  };

  if (data.error) {
    throw new Error(data.error.message ?? "NZDep ArcGIS error");
  }

  const attrs = data.features?.[0]?.attributes;
  if (!attrs) {
    return {
      sa1Code: "unknown",
      sa2Name: null,
      decile: null,
      source: "arcgis",
    };
  }

  const decileRaw = attrs.NZDep2023;
  const decile =
    decileRaw == null || Number.isNaN(Number(decileRaw))
      ? null
      : Math.round(Number(decileRaw));

  return {
    sa1Code: String(attrs.SA12023_code || attrs.SA12023_V1 || "unknown"),
    sa2Name: attrs.SA22023_name ?? null,
    decile,
    source: "arcgis",
  };
}
