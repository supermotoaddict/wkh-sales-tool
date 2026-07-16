export type Occupancy = "owner" | "rental";

export interface AddressSuggestion {
  id: string;
  label: string;
}

export interface AddressDetails {
  id: string;
  label: string;
  lat: number;
  lon: number;
  suburb?: string;
  town?: string;
  postcode?: string;
}

export interface FormAnswers {
  address: AddressSuggestion;
  occupancy: Occupancy;
  builtBefore2008: boolean;
  hasCommunityServicesCard: boolean;
  contactMessage?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  consent: boolean;
}

export interface NzDepResult {
  sa1Code: string;
  sa2Name: string | null;
  decile: number | null;
  source: "arcgis";
}

export interface EecaResult {
  checked: boolean;
  /** True when EECA records prior insulation work and/or an open insulation/heating application. */
  hasExistingClaim: boolean;
  /** EECA: records show ceiling and underfloor insulation already installed (prior claim). */
  hasInsulation: boolean;
  hasHeating: boolean;
  hasInsulationRequest: boolean;
  hasHeatingRequest: boolean;
  addressInsulationValid: boolean | null;
  addressHeatingValid: boolean | null;
  /** Human-readable summary matching what EECA’s tool would surface. */
  claimSummary: string | null;
  error?: string;
  raw?: Record<string, unknown>;
}

export interface EligibilityResult {
  eligible: boolean;
  fundingPercent: number | null;
  fundingReason: string;
  ineligibleReason?: string;
  nzDep: NzDepResult | null;
  eeca: EecaResult;
  answers: {
    addressLabel: string;
    addressId: string;
    occupancy: Occupancy;
    builtBefore2008: boolean;
    hasCommunityServicesCard: boolean;
  };
  checkedAt: string;
}

export type ClaimScenario =
  | "still_cold"
  | "new_owner"
  | "incomplete_install"
  | "other";

export interface SubmissionPayload {
  result: EligibilityResult;
  contactMessage?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** How long since the previous claim / insulation work (free text, e.g. "8 years", "2019"). */
  yearsSinceClaim?: string;
  /** One or more situations that apply to the inquiry. */
  claimScenarios?: ClaimScenario[];
}
