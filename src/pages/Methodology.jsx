import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* ── Section definitions ─────────────────────────────────────────────── */
const SECTIONS = [
  { id: "score",     label: "Suitability Score",    color: "#1e3a5f" },
  { id: "shadow",    label: "Shadow Simulation",     color: "#1e40af" },
  { id: "area",      label: "Rooftop Area",          color: "#15803d" },
  { id: "panels",    label: "Panel Count & Capacity",color: "#b45309" },
  { id: "financial", label: "Financial Estimates",   color: "#be185d" },
  { id: "co2",       label: "CO₂ Savings",           color: "#065f46" },
  { id: "height",    label: "Height Score",          color: "#374151" },
  { id: "whatif",    label: "What-If Impact",        color: "#92400e" },
  { id: "refs",      label: "Data Sources",          color: "#1e3a5f" },
];

/* ── Small reusables ─────────────────────────────────────────────────── */
function Formula({ children }) {
  return (
    <div style={{
      fontFamily: "monospace", fontSize: 13, background: "#0f172a",
      color: "#7dd3fc", borderRadius: 6, padding: "12px 16px",
      margin: "14px 0", lineHeight: 2, whiteSpace: "pre-wrap",
      borderLeft: "3px solid #1d4ed8"
    }}>
      {children}
    </div>
  );
}

function Note({ children }) {
  return (
    <p style={{
      fontSize: 12.5, color: "#64748b", background: "#f8fafc",
      borderLeft: "3px solid #cbd5e1", padding: "8px 12px",
      borderRadius: "0 4px 4px 0", margin: "12px 0", lineHeight: 1.7
    }}>
      {children}
    </p>
  );
}

function DataTable({ headers, rows }) {
  return (
    <div style={{ overflowX: "auto", margin: "16px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            {headers.map(h => (
              <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "transparent" : "#fafafa" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "9px 14px", color: j === 0 ? "#1e293b" : "#475569", fontWeight: j === 0 ? 600 : 400 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
        background: "#1e3a5f", color: "#fff", fontSize: 12, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2
      }}>{n}</div>
      <div style={{ flex: 1, fontSize: 14, color: "#374151", lineHeight: 1.75 }}>
        <strong style={{ color: "#0f172a", display: "block", marginBottom: 2 }}>{title}</strong>
        {children}
      </div>
    </div>
  );
}

/* ── Section bodies ──────────────────────────────────────────────────── */
function ScoreBody() {
  return (
    <>
      <p style={{ marginBottom: 16 }}>Four independent factors are normalised to 0–100 and combined into a single weighted index. Sunlight carries the highest weight because shadow obstruction is the dominant variable in Mumbai's dense urban fabric.</p>
      <Formula>{`Score = (Sunlight Score  × 0.50)
      + (Area Score      × 0.20)
      + (Height Score    × 0.10)
      + (Irradiance Score× 0.20)`}</Formula>
      <DataTable
        headers={["Component", "Weight", "Input range", "Rationale"]}
        rows={[
          ["Sunlight Hours", "50%", "0 – 100", "Actual shadow simulation per hour"],
          ["Rooftop Area", "20%", "0 – 100", "Larger roofs fit more panels"],
          ["Building Height", "10%", "0 – 100", "Taller buildings are shaded less"],
          ["Solar Irradiance", "20%", "Fixed 92", "Mumbai-specific GHI resource"],
        ]}
      />
      <Note>Classification: Score ≥ 70 → Highly Suitable · 55–69 → Suitable · 40–54 → Moderately Suitable · &lt;40 → Less Suitable</Note>
    </>
  );
}

function ShadowBody() {
  return (
    <>
      <p style={{ marginBottom: 16 }}>For each hour from 6 AM to 6 PM (13 steps), the solar position is computed at Mumbai's coordinates. Shadow polygons from every neighbouring building are projected and intersected with the target rooftop.</p>
      <Step n={1} title="Solar position">Sun altitude (°) and azimuth (°) are derived from latitude 19.076°N, longitude 72.877°E, time of day, and season. Hours where altitude &lt; 5° are skipped as pre-dawn / post-dusk.</Step>
      <Step n={2} title="Neighbour query">All buildings within 200 m taller than the target are queried from the LoD layer. Only buildings with net height advantage can cast shadow on the target rooftop.</Step>
      <Step n={3} title="Shadow projection">A shadow polygon is geometrically projected from each neighbour in the direction opposite the sun azimuth. Shadow length = effective height ÷ tan(sun altitude).</Step>
      <Step n={4} title="Intersection">All shadow polygons for that hour are unioned via geodesic geometry, then intersected with the target rooftop polygon. Shadow fraction = intersect area ÷ rooftop area.</Step>
      <Step n={5} title="Sunny hour threshold">An hour is counted as sunny if sunlit fraction exceeds 30% (i.e. shadow covers &lt; 70% of rooftop area).</Step>
      <Formula>{`Sunlight Score = (Sunny Hours ÷ Eligible Hours) × 100`}</Formula>
      <Note>Eligible hours excludes steps where sun altitude &lt; 5°, avoiding seasonal twilight penalties that would unfairly lower the score.</Note>
    </>
  );
}

function AreaBody() {
  return (
    <>
      <p style={{ marginBottom: 16 }}>Rooftop area is calculated from the building polygon using geodesic area (accounting for Earth's curvature). 70% of the total area is treated as usable for panel installation.</p>
      <Formula>{`Area Score  = min(100,  log₁₀(area) ÷ log₁₀(500) × 100)
Usable Area = Total Rooftop Area × 0.70`}</Formula>
      <DataTable
        headers={["Rooftop area", "Area score", "Usable (70%)"]}
        rows={[
          ["50 m²", "51", "35 m²"],
          ["100 m²", "65", "70 m²"],
          ["250 m²", "87", "175 m²"],
          ["500 m²", "100 (capped)", "350 m²"],
          ["1,000 m²", "100 (capped)", "700 m²"],
        ]}
      />
      <Note>70% factor accounts for: parapet setbacks, water tanks, HVAC ducts, staircase headrooms, structural load constraints on older buildings, and self-cast rooftop shadows.</Note>
    </>
  );
}

function PanelsBody() {
  return (
    <>
      <p style={{ marginBottom: 16 }}>Sized around a standard 330 W monocrystalline panel with ~2 m² footprint including installation row clearance.</p>
      <Formula>{`Panel Count      = ⌊ Usable Area ÷ 2 m² ⌋
Capacity (kWp)   = Panel Count × 330 W ÷ 1000
Generation (kWh) = Capacity × 1,500 kWh/kWp/yr`}</Formula>
      <DataTable
        headers={["Usable area", "Panels", "Capacity", "Annual generation"]}
        rows={[
          ["70 m²", "35", "11.6 kWp", "17,325 kWh"],
          ["175 m²", "87", "28.7 kWp", "43,050 kWh"],
          ["350 m²", "175", "57.8 kWp", "86,625 kWh"],
          ["700 m²", "350", "115.5 kWp", "1,73,250 kWh"],
        ]}
      />
      <Note>1,500 kWh/kWp/yr = ~5.5 peak sun hours/day × 365 days × 75% system efficiency — consistent with MNRE Maharashtra benchmarks.</Note>
    </>
  );
}

function FinancialBody() {
  return (
    <>
      <p style={{ marginBottom: 16 }}>All rates are 2024 Mumbai-specific figures sourced from MAHADISCOM tariff orders and MNRE Maharashtra policy documents.</p>
      <Formula>{`Annual Savings = Generation × ₹7/unit
Install Cost   = Capacity  × ₹60,000/kWp
Payback Period = Install Cost ÷ Annual Savings`}</Formula>
      <DataTable
        headers={["Parameter", "Value used", "Source"]}
        rows={[
          ["Grid tariff", "₹7 / kWh", "MAHADISCOM domestic rate (2024)"],
          ["Install cost", "₹60,000 / kWp", "MNRE Maharashtra benchmark (2024)"],
          ["Subsidy", "Not modelled", "PM Surya Ghar excluded for simplicity"],
        ]}
      />
      <Note>Actual payback depends on net metering availability, PM Surya Ghar subsidy eligibility, panel degradation (~0.5%/yr), and inverter efficiency. This is an indicative estimate; consult a certified installer for binding figures.</Note>
    </>
  );
}

function Co2Body() {
  return (
    <>
      <p style={{ marginBottom: 16 }}>Estimates how much carbon the system displaces by replacing grid electricity with clean solar power.</p>
      <Formula>{`CO₂ Saved = Annual Generation × 0.82 kg/kWh ÷ 1000
           (result in tonnes CO₂ / year)`}</Formula>
      <Note><strong>0.82 kg CO₂/kWh</strong> is the India national grid emission factor — CEA CO₂ Baseline Database (2023). India's coal-heavy generation mix means rooftop solar offsets significantly more carbon per unit than grids in Europe or the US.</Note>
      <p style={{ marginTop: 14, fontSize: 14, color: "#374151", lineHeight: 1.75 }}>
        Example: a 28.7 kWp system generating 43,050 kWh/yr saves approximately <strong>35.3 tonnes CO₂/yr</strong>.
      </p>
    </>
  );
}

function HeightBody() {
  return (
    <>
      <p style={{ marginBottom: 16 }}>Taller buildings rise above neighbouring obstructions. A small height bonus carries 10% weight in the overall score.</p>
      <Formula>{`Height Score = min(100, (building height ÷ 50 m) × 100)
If height is unknown → fallback score = 40`}</Formula>
      <DataTable
        headers={["Building height", "Score", "Approx. floors"]}
        rows={[
          ["≤ 10 m", "20", "~3 floors"],
          ["15 m", "30", "~5 floors"],
          ["24 m", "48", "~8 floors"],
          ["36 m", "72", "~12 floors"],
          ["50+ m", "100", "~16+ floors"],
        ]}
      />
      <Note>Height carries only 10% weight because actual shadow obstruction is captured by the real shadow simulation (50% weight). Height is a lightweight proxy for buildings whose neighbours were not fully queried within the 200 m radius.</Note>
    </>
  );
}

function WhatIfBody() {
  return (
    <>
      <p style={{ marginBottom: 16 }}>The What-If tool lets you draw hypothetical future buildings on the map and immediately see how they affect the analysed rooftop's solar score.</p>
      <Step n={1} title="Baseline run">Shadow analysis runs with only real LoD neighbours. Produces the Baseline Score.</Step>
      <Step n={2} title="Simulated run">Analysis reruns adding your drawn buildings as additional shadow-casters. Produces the Simulated Score.</Step>
      <Step n={3} title="Impact calculation">Impact = Simulated Score − Baseline Score. Negative impact means the new building reduces solar potential by casting additional shadow.</Step>
      <Formula>{`Impact = Simulated Score − Baseline Score`}</Formula>
      <Note>Both runs use the full polygon-based shadow engine. The impact number reflects actual geometric shadow differences, not a simplified approximation.</Note>
    </>
  );
}

function RefsBody() {
  return (
    <>
      <DataTable
        headers={["Parameter", "Value", "Source"]}
        rows={[
          ["Location", "19.076°N, 72.877°E", "Mumbai city centre"],
          ["Analysis window", "6 AM – 6 PM", "13 hourly simulation steps"],
          ["Neighbour radius", "200 m", "Urban shadowing effective range"],
          ["Panel power", "330 W", "Standard monocrystalline (2024)"],
          ["Panel footprint", "2 m²", "Including row clearance"],
          ["Usable area factor", "70%", "Industry standard for Indian rooftops"],
          ["Performance ratio", "1,500 kWh/kWp/yr", "MNRE Maharashtra benchmark"],
          ["Grid tariff", "₹7 / kWh", "MAHADISCOM domestic (2024)"],
          ["Install cost", "₹60,000 / kWp", "MNRE Maharashtra (2024)"],
          ["CO₂ factor", "0.82 kg CO₂/kWh", "CEA CO₂ Baseline Database (2023)"],
          ["Irradiance score", "92/100 (fixed)", "Mumbai GHI ~5.5 kWh/m²/day"],
        ]}
      />
      <Note>SolarSight is an indicative planning tool. Actual solar yield depends on panel orientation, tilt, inverter efficiency, soiling losses, and regulatory approvals. Always consult a certified solar installer for final system design.</Note>
    </>
  );
}

const BODY_MAP = {
  score: ScoreBody, shadow: ShadowBody, area: AreaBody, panels: PanelsBody,
  financial: FinancialBody, co2: Co2Body, height: HeightBody, whatif: WhatIfBody, refs: RefsBody,
};

/* ── Main page ───────────────────────────────────────────────────────── */
export default function Methodology() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const sectionRefs = useRef({});
  const [active, setActive] = useState("score");

  /* scroll to section on hash change */
  useEffect(() => {
    const id = hash.replace("#", "");
    if (id && sectionRefs.current[id]) {
      setTimeout(() => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      setActive(id);
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [hash]);

  /* track active section while scrolling */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    window.location.hash = id;
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: "#0f172a" }}>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div style={{
        height: 52, background: "#1e3a5f", display: "flex", alignItems: "center",
        padding: "0 24px", gap: 20, position: "sticky", top: 0, zIndex: 200,
        borderBottom: "1px solid rgba(255,255,255,0.08)"
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, padding: "5px 14px", fontSize: 12, color: "#fff", cursor: "pointer", fontWeight: 500, letterSpacing: "0.02em" }}
        >
          ← Back
        </button>
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.01em" }}>SolarSight</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 400 }}>/ Calculation Methodology</span>
      </div>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "40px 24px 36px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#64748b", textTransform: "uppercase", marginBottom: 10 }}>Technical Reference</div>
          <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#0f172a", margin: "0 0 10px", lineHeight: 1.15 }}>
            Solar Suitability — Full Methodology
          </h1>
          <p style={{ fontSize: 15, color: "#475569", maxWidth: 680, lineHeight: 1.7, margin: "0 0 20px" }}>
            Every formula, constant, and assumption used in the SolarSight rooftop analysis engine — transparent and auditable.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Mumbai · 19.076°N 72.877°E", "6 AM – 6 PM · 13 hourly steps", "200 m neighbour radius", "Geodesic polygon geometry"].map(t => (
              <span key={t} style={{ fontSize: 12, background: "#e2e8f0", color: "#475569", borderRadius: 4, padding: "4px 10px", fontWeight: 500 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two-column body ─────────────────────────────────────────── */}
      <div style={{ display: "flex", maxWidth: 1400, margin: "0 auto", minHeight: "calc(100vh - 52px)" }}>

        {/* Left nav — sticky */}
        <nav style={{
          width: 220, flexShrink: 0, position: "sticky", top: 52, height: "calc(100vh - 52px)",
          overflowY: "auto", borderRight: "1px solid #e2e8f0", padding: "28px 0",
          background: "#fff"
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#94a3b8", textTransform: "uppercase", padding: "0 20px 12px" }}>Contents</div>
          {SECTIONS.map((sec, i) => {
            const isActive = active === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => scrollTo(sec.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 20px", border: "none", background: isActive ? "#f0f7ff" : "transparent",
                  cursor: "pointer", textAlign: "left", position: "relative",
                  borderLeft: isActive ? `3px solid ${sec.color}` : "3px solid transparent",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, minWidth: 16 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontSize: 12.5, fontWeight: isActive ? 600 : 400, color: isActive ? sec.color : "#475569", lineHeight: 1.35 }}>{sec.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right content */}
        <main style={{ flex: 1, padding: "0 0 80px", overflow: "auto" }}>
          {SECTIONS.map((sec, i) => {
            const Body = BODY_MAP[sec.id];
            return (
              <section
                key={sec.id}
                id={sec.id}
                ref={el => { sectionRefs.current[sec.id] = el; }}
                style={{ borderBottom: "1px solid #f1f5f9", scrollMarginTop: 52 }}
              >
                {/* Section heading strip */}
                <div style={{ padding: "32px 40px 24px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#94a3b8", textTransform: "uppercase" }}>§ {String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h2 style={{ fontSize: "clamp(1.15rem, 2vw, 1.5rem)", fontWeight: 700, color: sec.color, margin: 0, lineHeight: 1.2 }}>{sec.label}</h2>
                </div>
                {/* Section body */}
                <div style={{ padding: "28px 40px 36px" }}>
                  <Body />
                </div>
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
}
