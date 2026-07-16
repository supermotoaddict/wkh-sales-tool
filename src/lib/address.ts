import type { AddressDetails, AddressSuggestion } from "./types";

const ADDRESS_RIGHT_API_KEY =
  process.env.ADDRESS_RIGHT_API_KEY ?? "318177_WJLqDXQSQ92w75ZR";
const AUTOCOMPLETE_URL = "https://www.addressright.co.nz/autocomplete.json";
const ADDRESS_URL = "https://www.addressright.co.nz/address.json";

/**
 * NZ address autocomplete via AddressRight (same service EECA’s eligibility tool uses).
 * Free for this sandbox using the public key embedded on EECA’s checker page.
 * For production, register your own AddressRight / Terranet key.
 */
export async function searchAddresses(term: string): Promise<AddressSuggestion[]> {
  const trimmed = term.trim();
  if (trimmed.length < 3) return [];

  const url = new URL(AUTOCOMPLETE_URL);
  url.searchParams.set("api_key", ADDRESS_RIGHT_API_KEY);
  url.searchParams.set("term", trimmed);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "WKH-Sales-Tool/1.0" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Address search failed (${res.status})`);
  }

  const data = (await res.json()) as Array<{ id: string; label: string }>;
  return (data ?? []).slice(0, 8).map((item) => ({
    id: item.id,
    label: item.label,
  }));
}

export async function getAddressDetails(id: string): Promise<AddressDetails> {
  const url = new URL(ADDRESS_URL);
  url.searchParams.set("api_key", ADDRESS_RIGHT_API_KEY);
  url.searchParams.set("id", id);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "WKH-Sales-Tool/1.0" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Address details failed (${res.status})`);
  }

  const data = (await res.json()) as {
    formatted_address?: { line1?: string; line3?: string; line4?: string };
    structured_address?: { suburb?: string; town?: string; postcode?: string };
    location?: { wgs84_lat?: number; wgs84_lon?: number };
    references?: { id?: string };
  };

  const lat = data.location?.wgs84_lat;
  const lon = data.location?.wgs84_lon;
  if (lat == null || lon == null) {
    throw new Error("Address has no coordinates");
  }

  const line1 = data.formatted_address?.line1 ?? "";
  const line3 = data.formatted_address?.line3 ?? "";
  const line4 = data.formatted_address?.line4 ?? "";
  const label = [line1, line3, line4].filter(Boolean).join(", ");

  return {
    id: data.references?.id ?? id,
    label,
    lat,
    lon,
    suburb: data.structured_address?.suburb,
    town: data.structured_address?.town,
    postcode: data.structured_address?.postcode,
  };
}
