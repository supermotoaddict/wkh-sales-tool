import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="terms">
      <p>
        <Link href="/">← Back</Link>
      </p>
      <h1>Terms & privacy</h1>
      <p>
        By using this Warm Home Grant checker (“the Tool”), you agree to these terms. This is a
        sales helper for homeowners — not an official EECA service.
      </p>
      <h2>Consent</h2>
      <p>
        When you submit an address, you consent to lookups against AddressRight, EECA’s Warmer Kiwi
        Homes qualify service (including prior insulation / existing claim signals), and NZDep2023
        deprivation data.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Address and your yes/no answers</li>
        <li>Eligibility outcome, funding %, NZDep, EECA claim flags</li>
        <li>Contact details and messages you provide</li>
      </ul>
      <p>
        Submissions are saved locally and emailed to our team so we can follow up. Final grant
        decisions rest with EECA and approved providers.
      </p>
      <h2>Existing claims</h2>
      <p>
        If EECA records show ceiling and underfloor insulation already at the address, we flag that
        and ask for circumstances. Claims from roughly the last 10–15 years are usually declined for
        second funding; new owners of a previously claimed home rarely qualify.
      </p>
      <h2>Contact</h2>
      <p>
        <a href="mailto:insulator.dan@gmail.com">insulator.dan@gmail.com</a> · EECA 0800 749 782
      </p>
    </main>
  );
}
