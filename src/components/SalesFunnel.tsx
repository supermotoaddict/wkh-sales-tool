"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type {
  AddressSuggestion,
  ClaimScenario,
  EligibilityResult,
  Occupancy,
} from "@/lib/types";

type Step =
  | "address"
  | "occupancy"
  | "built"
  | "csc"
  | "checking"
  | "result"
  | "lead"
  | "done";

const SCENARIOS: { value: ClaimScenario; label: string }[] = [
  { value: "still_cold", label: "House still feels cold" },
  { value: "new_owner", label: "I'm a new owner" },
  { value: "incomplete_install", label: "Install may be incomplete" },
  { value: "other", label: "Other" },
];

export default function SalesFunnel() {
  const [step, setStep] = useState<Step>("address");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [address, setAddress] = useState<AddressSuggestion | null>(null);
  const [consent, setConsent] = useState(false);
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [builtBefore2008, setBuiltBefore2008] = useState<boolean | null>(null);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [yearsSinceClaim, setYearsSinceClaim] = useState("");
  const [claimScenarios, setClaimScenarios] = useState<ClaimScenario[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3 || address?.label === query) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/address?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.results ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, address?.label]);

  function pickAddress(item: AddressSuggestion) {
    setAddress(item);
    setQuery(item.label);
    setSuggestions([]);
  }

  function onQuery(value: string) {
    setAddress(null);
    setQuery(value);
    if (value.trim().length < 3) setSuggestions([]);
  }

  function goOccupancy() {
    if (!address || !consent) return;
    setStep("occupancy");
  }

  function chooseOccupancy(value: Occupancy) {
    setOccupancy(value);
    if (value === "rental") {
      // Still run a local result without EECA for speed
      setResult({
        eligible: false,
        fundingPercent: null,
        fundingReason: "Rental properties are not eligible.",
        ineligibleReason:
          "This programme is only for owner-occupied homes — not rentals.",
        nzDep: null,
        eeca: {
          checked: false,
          hasExistingClaim: false,
          hasInsulation: false,
          hasHeating: false,
          hasInsulationRequest: false,
          hasHeatingRequest: false,
          addressInsulationValid: null,
          addressHeatingValid: null,
          claimSummary: null,
        },
        answers: {
          addressLabel: address!.label,
          addressId: address!.id,
          occupancy: "rental",
          builtBefore2008: true,
          hasCommunityServicesCard: false,
        },
        checkedAt: new Date().toISOString(),
      });
      setStep("result");
      return;
    }
    setStep("built");
  }

  function chooseBuilt(value: boolean) {
    setBuiltBefore2008(value);
    if (!value) {
      setResult({
        eligible: false,
        fundingPercent: null,
        fundingReason: "Homes built in 2008 or later are not eligible.",
        ineligibleReason: "Your home must have been built before 2008.",
        nzDep: null,
        eeca: {
          checked: false,
          hasExistingClaim: false,
          hasInsulation: false,
          hasHeating: false,
          hasInsulationRequest: false,
          hasHeatingRequest: false,
          addressInsulationValid: null,
          addressHeatingValid: null,
          claimSummary: null,
        },
        answers: {
          addressLabel: address!.label,
          addressId: address!.id,
          occupancy: "owner",
          builtBefore2008: false,
          hasCommunityServicesCard: false,
        },
        checkedAt: new Date().toISOString(),
      });
      setStep("result");
      return;
    }
    setStep("csc");
  }

  function chooseCsc(value: boolean) {
    runCheck(value);
  }

  function runCheck(csc: boolean) {
    if (!address || occupancy !== "owner" || builtBefore2008 !== true) return;
    setStep("checking");
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            occupancy: "owner",
            builtBefore2008: true,
            hasCommunityServicesCard: csc,
            consent: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Check failed");
        setResult(data.result);
        setStep("result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Check failed");
        setStep("csc");
      }
    });
  }

  async function submitLead() {
    if (!result) return;
    setStatus(null);
    if (!phone.trim() && !email.trim()) {
      setStatus("Please add a phone number or email so we can contact you.");
      return;
    }
    if (result.eeca.hasExistingClaim) {
      if (!yearsSinceClaim.trim() || claimScenarios.length === 0 || !message.trim()) {
        setStatus("Please complete the existing-claim questions.");
        return;
      }
    }
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result,
          contactName: name,
          contactPhone: phone,
          contactEmail: email,
          contactMessage: message,
          yearsSinceClaim,
          claimScenarios,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setStep("done");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Submit failed");
    }
  }

  function restart() {
    setStep("address");
    setQuery("");
    setSuggestions([]);
    setAddress(null);
    setConsent(false);
    setOccupancy(null);
    setBuiltBefore2008(null);
    setResult(null);
    setError(null);
    setName("");
    setPhone("");
    setEmail("");
    setYearsSinceClaim("");
    setClaimScenarios([]);
    setMessage("");
    setStatus(null);
  }

  function toggleScenario(value: ClaimScenario) {
    setClaimScenarios((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  const stepNum =
    step === "address"
      ? 1
      : step === "occupancy"
        ? 2
        : step === "built"
          ? 3
          : step === "csc" || step === "checking"
            ? 4
            : 5;

  return (
    <div className="funnel" ref={panelRef}>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${(stepNum / 5) * 100}%` }} />
      </div>
      <p className="step-label">Step {Math.min(stepNum, 4)} of 4</p>

      {step === "address" && (
        <section className="screen">
          <h2>What&apos;s your address?</h2>
          <p className="sub">Start typing — pick your NZ address from the list.</p>
          <input
            className="big-input"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="street-address"
            placeholder="e.g. 12 Example Street, Auckland"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
          {searching && <p className="hint">Searching…</p>}
          {suggestions.length > 0 && (
            <ul className="suggest">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => pickAddress(s)}>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I consent to address checks with EECA &amp; NZDep.{" "}
              <Link href="/terms">Find out more</Link>
            </span>
          </label>
          <button
            type="button"
            className="cta"
            disabled={!address || !consent}
            onClick={goOccupancy}
          >
            Continue
          </button>
        </section>
      )}

      {step === "occupancy" && (
        <section className="screen">
          <button type="button" className="back" onClick={() => setStep("address")}>
            ← Back
          </button>
          <h2>Do you own and live in this home?</h2>
          <p className="sub">Rentals don&apos;t qualify for this grant.</p>
          <div className="tap-stack">
            <button type="button" className="tap" onClick={() => chooseOccupancy("owner")}>
              Yes — I own &amp; live here
            </button>
            <button
              type="button"
              className="tap muted"
              onClick={() => chooseOccupancy("rental")}
            >
              No — it&apos;s a rental
            </button>
          </div>
        </section>
      )}

      {step === "built" && (
        <section className="screen">
          <button type="button" className="back" onClick={() => setStep("occupancy")}>
            ← Back
          </button>
          <h2>Was it built before 2008?</h2>
          <p className="sub">Homes from 2008 onwards don&apos;t qualify.</p>
          <div className="tap-stack">
            <button type="button" className="tap" onClick={() => chooseBuilt(true)}>
              Yes
            </button>
            <button type="button" className="tap muted" onClick={() => chooseBuilt(false)}>
              No
            </button>
          </div>
        </section>
      )}

      {step === "csc" && (
        <section className="screen">
          <button type="button" className="back" onClick={() => setStep("built")}>
            ← Back
          </button>
          <h2>Community Services Card?</h2>
          <p className="sub">
            CSC or SuperGold Combo = up to <strong>90%</strong> funded, any zone.
          </p>
          {error && <p className="alert">{error}</p>}
          <div className="tap-stack">
            <button
              type="button"
              className="tap"
              disabled={isPending}
              onClick={() => chooseCsc(true)}
            >
              Yes
            </button>
            <button
              type="button"
              className="tap muted"
              disabled={isPending}
              onClick={() => chooseCsc(false)}
            >
              No
            </button>
          </div>
        </section>
      )}

      {step === "checking" && (
        <section className="screen centre">
          <div className="spinner" />
          <h2>Checking your address…</h2>
          <p className="sub">Funding zone + any existing EECA claim. Usually a few seconds.</p>
        </section>
      )}

      {step === "result" && result && (
        <section className="screen">
          <div
            className={
              result.eeca.hasExistingClaim
                ? "status claim"
                : result.eligible
                  ? "status ok"
                  : "status no"
            }
          >
            {result.eeca.hasExistingClaim
              ? "Existing claim found"
              : result.eligible
                ? "You may qualify"
                : "Not eligible"}
          </div>

          {result.eligible && !result.eeca.hasExistingClaim && (
            <p className="funding">
              Up to <span>{result.fundingPercent}%</span> government funded
            </p>
          )}

          {result.eligible && result.eeca.hasExistingClaim && result.fundingPercent != null && (
            <p className="funding soft">
              Area / CSC funding band: <span>{result.fundingPercent}%</span>
            </p>
          )}

          <p className="address-line">{result.answers.addressLabel}</p>
          <p className="sub tight">{result.fundingReason}</p>

          {result.ineligibleReason && <p className="alert">{result.ineligibleReason}</p>}

          {result.eeca.hasExistingClaim && (
            <div className="claim-box">
              {result.eeca.claimSummary && <p className="quote">“{result.eeca.claimSummary}”</p>}
              <p>
                Second claims within ~10–15 years are usually declined. New owners of a previously
                claimed home rarely qualify. Leave a few details and we&apos;ll advise.
              </p>
            </div>
          )}

          {(result.eligible || result.eeca.hasExistingClaim) && (
            <button type="button" className="cta" onClick={() => setStep("lead")}>
              {result.eeca.hasExistingClaim ? "Get advice on my claim" : "Get a free callback"}
            </button>
          )}

          {!result.eligible && !result.eeca.hasExistingClaim && (
            <button type="button" className="cta ghost" onClick={restart}>
              Try another address
            </button>
          )}
        </section>
      )}

      {step === "lead" && result && (
        <section className="screen">
          <button type="button" className="back" onClick={() => setStep("result")}>
            ← Back
          </button>
          <h2>{result.eeca.hasExistingClaim ? "Tell us what happened" : "Where can we reach you?"}</h2>
          <p className="sub">
            {result.eeca.hasExistingClaim
              ? "Required so we can review your situation."
              : "A specialist will call about your grant options."}
          </p>

          <label className="field">
            Phone
            <input
              className="big-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="021 …"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="field">
            Name
            <input
              className="big-input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            Email <span className="opt">(optional)</span>
            <input
              className="big-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {result.eeca.hasExistingClaim && (
            <>
              <label className="field">
                How long since the last claim?
                <input
                  className="big-input"
                  type="text"
                  placeholder="e.g. 8 years / 2016 / unsure"
                  value={yearsSinceClaim}
                  onChange={(e) => setYearsSinceClaim(e.target.value)}
                />
              </label>
              <p className="field-label">Your situation (select all that apply)</p>
              <div className="chip-row">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={claimScenarios.includes(s.value) ? "chip on" : "chip"}
                    aria-pressed={claimScenarios.includes(s.value)}
                    onClick={() => toggleScenario(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <label className="field">
                Circumstances
                <textarea
                  className="big-input area"
                  rows={3}
                  placeholder="e.g. Still cold in winter / bought the house last year…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
            </>
          )}

          {!result.eeca.hasExistingClaim && (
            <label className="field">
              Message <span className="opt">(optional)</span>
              <textarea
                className="big-input area"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
          )}

          {status && <p className="alert">{status}</p>}
          <button type="button" className="cta" onClick={submitLead}>
            Submit
          </button>
        </section>
      )}

      {step === "done" && (
        <section className="screen centre">
          <div className="status ok">Sent</div>
          <h2>Thanks — we&apos;ve got it</h2>
          <p className="sub">Our team will be in touch shortly.</p>
          <button type="button" className="cta ghost" onClick={restart}>
            Check another address
          </button>
        </section>
      )}
    </div>
  );
}
