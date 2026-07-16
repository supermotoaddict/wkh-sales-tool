import Link from "next/link";
import SalesFunnel from "@/components/SalesFunnel";

export default function HomePage() {
  return (
    <div className="page">
      <header className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-copy">
          <p className="brand">Warm Home Grant</p>
          <h1>Check if you could get up to 90% off insulation.</h1>
          <p className="tagline">Owner-occupied NZ homes · Takes about 30 seconds</p>
        </div>
      </header>

      <main className="main">
        <SalesFunnel />
      </main>

      <footer className="foot">
        <Link href="/terms">Terms &amp; privacy</Link>
        <span aria-hidden="true">·</span>
        <a
          href="https://www.eeca.govt.nz/co-funding-and-support/products/warmer-kiwi-homes-programme/"
          target="_blank"
          rel="noreferrer"
        >
          Official programme
        </a>
      </footer>
    </div>
  );
}
