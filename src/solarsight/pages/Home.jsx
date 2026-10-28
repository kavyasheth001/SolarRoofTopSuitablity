// SolarSight home. Shows the product with its own renders (BMC LoD2 roofs, a real panel layout, the
// sun-hours heatmap) and a real result, rather than stock imagery.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Logo, NavLinks, num } from '../ui/kit';
import { OWS_URL } from '../config';
import registry from '../layers/registry.json';
import heroImage from '../assets/hero-parel.jpg';
import heatmapImage from '../assets/roof-heatmap.jpg';
import planImage from '../assets/panel-plan.jpg';

async function countOf(layer) {
  const res = await fetch(`${OWS_URL}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${registry.workspace}:${layer}&resultType=hits`);
  return Number((await res.text()).match(/numberMatched="(\d+)"/)?.[1]) || null;
}

// A real run of the tool (Parekh Corporation, Parel; polycrystalline 330 W option, best value).
const EXAMPLE = {
  building: 'Parekh Corporation, Parel',
  score: 83, panels: 181, kwp: 59.7, kwh: 85256, payback: 5.0, ownShade: 9.2,
  cost: [
    ['Panels, 59,730 Wp at ₹20', 1194600], ['Inverter, structure, installation at ₹30/Wp', 1791900], ['Your cost', 2986500, true],
    ['Saved per year at ₹7 a unit', 596789], ['Payback', '5.0 years', true],
  ],
};

const ACCOUNTS_FOR = [
  ['Shadows from every taller building within 200 m', 'Checked hour by hour for each point on the roof, at that point\'s own height.'],
  ['The tanks, stair rooms and parapets on your roof', 'They shade the roof around them, and panels are kept clear of them.'],
  ['Sloped roofs', 'Panels lie flush on planes that face east, south or west. North slopes are left out.'],
  ['The monsoon', 'Monthly sunlight for Mumbai from NASA POWER, so the June to September dip is in the numbers.'],
  ['Heat', 'Panels lose output in the hot months; each module\'s temperature coefficient is applied.'],
  ['Row spacing', 'Rows never shade each other between 9 and 3 on the shortest day of the year.'],
  ['Subsidy', 'PM Surya Ghar for homes and housing societies, capped at 3 kW per flat.'],
  ['Real ground and roof heights', 'Taken from the BMC LoD2 building models, to within about half a metre.'],
];

const grain = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")";

function PrimaryLink({ to, children }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-[15px] font-semibold text-paper transition hover:bg-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:scale-[0.98]">
      {children} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function Home() {
  const [stats, setStats] = useState({});
  useEffect(() => {
    Promise.all([countOf('building_new'), countOf('solar_panel_polygon'), countOf('heritage')])
      .then(([buildings, solar, heritage]) => setStats({ buildings, solar, heritage }))
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-full bg-paper text-ink">
      <div className="pointer-events-none fixed inset-0 opacity-[0.07] mix-blend-multiply" style={{ backgroundImage: grain }} aria-hidden />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">Skip to content</a>

      <header className="relative mx-auto flex max-w-[1240px] items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-6">
          <div className="hidden sm:block"><NavLinks /></div>
          <Link to="/map" className="text-sm font-semibold text-ink underline decoration-sun-500 decoration-2 underline-offset-[6px] transition hover:decoration-ink">Open the map</Link>
        </div>
      </header>

      <main id="main" className="relative">
        {/* Hero: copy left, the product's own render right, a real result overlapping it. */}
        <section className="mx-auto grid max-w-[1240px] gap-10 px-6 pb-20 pt-8 lg:grid-cols-12 lg:gap-8 lg:pt-14">
          <div className="lg:col-span-5 lg:pt-8">
            <p className="flex items-center gap-3 text-sm font-medium text-ink/60">
              <span className="h-px w-8 bg-sun-500" /> F/S ward, Mumbai · Parel, Lalbaug, Sewri, Naigaon
            </p>
            <h1 className="mt-6 text-balance font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[68px]">
              Every roof in Parel, measured against <em className="font-medium text-sun-600">the sun</em>.
            </h1>
            <p className="mt-6 max-w-[34rem] text-pretty text-[17px] leading-[1.7] text-ink/70">
              SolarSight reads each building's real roof from the city's 3D model, tanks and stair rooms included,
              follows the sun through the year, and lays out the panels that will actually fit. You get the energy,
              the cost and the payback for that exact layout.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <PrimaryLink to="/map">Analyse a building</PrimaryLink>
              <Link to="/plans" className="text-[15px] font-semibold text-ink/70 transition hover:text-ink">or open saved plans</Link>
            </div>
          </div>

          <figure className="relative lg:col-span-7">
            <div className="overflow-hidden rounded-[28px] shadow-[0_40px_80px_-40px_rgba(11,18,32,0.55)] ring-1 ring-ink/10">
              <img src={heroImage} alt="3D view of Parekh Corporation in Parel with rows of solar panels laid out on its roof, among neighbouring towers" className="aspect-[16/10] w-full object-cover" />
            </div>
            <div className="relative z-10 mx-4 -mt-16 max-w-[300px] rounded-2xl bg-paper p-5 shadow-[0_24px_50px_-24px_rgba(11,18,32,0.5)] ring-1 ring-ink/10 sm:absolute sm:-bottom-10 sm:left-6 sm:mx-0 sm:mt-0">
              <div className="text-xs font-medium text-ink/50">{EXAMPLE.building}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold tabular-nums">{EXAMPLE.score}</span>
                <span className="text-sm text-ink/50">/ 100 suitability</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-ink/10 pt-4 text-sm">
                <div><dt className="text-ink/50">Panels</dt><dd className="font-semibold tabular-nums">{EXAMPLE.panels} · {EXAMPLE.kwp} kWp</dd></div>
                <div><dt className="text-ink/50">A year</dt><dd className="font-semibold tabular-nums">{num(EXAMPLE.kwh)} kWh</dd></div>
                <div><dt className="text-ink/50">Payback</dt><dd className="font-semibold tabular-nums">{EXAMPLE.payback.toFixed(1)} years</dd></div>
                <div><dt className="text-ink/50">Own-roof shade</dt><dd className="font-semibold tabular-nums">{EXAMPLE.ownShade}%</dd></div>
              </dl>
            </div>
            <figcaption className="ml-auto mt-4 max-w-[17rem] text-right text-xs leading-relaxed text-ink/45 sm:mt-3">Rendered in SolarSight: BMC LoD2 roofs, the planned panels and the roof's sun-hours.</figcaption>
          </figure>
        </section>

        {/* Live coverage numbers, straight from our GeoServer. */}
        <section className="mx-auto max-w-[1240px] px-6">
          <dl className="grid grid-cols-2 gap-px border-y border-ink/15 bg-ink/15 lg:grid-cols-4">
            {[
              [stats.buildings, 'buildings with their real roof shape'],
              [stats.solar, 'rooftops that already have panels'],
              [stats.heritage, 'heritage buildings flagged for permissions'],
              [144, 'sun positions checked for every roof'],
            ].map(([value, label]) => (
              <div key={label} className="bg-paper px-6 py-7 odd:pl-0 lg:odd:pl-6 lg:first:pl-0">
                <dd className="font-display text-4xl font-semibold tabular-nums tracking-tight">{value == null ? '–' : num(value)}</dd>
                <dt className="mt-1 text-sm text-ink/60">{label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* How it works, as alternating rows. */}
        <section className="mx-auto max-w-[1240px] px-6 pb-8 pt-24">
          <h2 className="max-w-xl text-balance font-display text-4xl font-semibold tracking-[-0.015em] sm:text-[44px]">From a building name to a priced plan, in about a minute.</h2>

          <div className="mt-16 grid items-center gap-10 lg:grid-cols-12">
            <div className="overflow-hidden rounded-3xl ring-1 ring-ink/10 lg:col-span-7">
              <img src={heatmapImage} alt="Heatmap of sun-hours across a roof: mostly orange, with purple strips where stair rooms cast shade" loading="lazy" className="aspect-[6/5] w-full origin-[30%_26%] scale-[1.4] object-cover lg:aspect-[7/5]" />
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <span className="font-display text-lg italic text-sun-600">01</span>
              <h3 className="mt-2 font-display text-[28px] font-semibold leading-tight">See where the sun lands</h3>
              <p className="mt-3 text-pretty leading-[1.7] text-ink/70">
                The sun moves across your roof hour by hour. Every taller neighbour, and every tank and stair room on the roof
                itself, casts its shadow. The colours show how many hours each spot is in sun.
              </p>
            </div>
          </div>

          <div className="mt-20 grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4 lg:row-start-1">
              <span className="font-display text-lg italic text-sun-600">02</span>
              <h3 className="mt-2 font-display text-[28px] font-semibold leading-tight">Choose a panel, see it on the roof</h3>
              <p className="mt-3 text-pretty leading-[1.7] text-ink/70">
                Six common panels, or your own. Each is laid out at the angle that collects the most energy, in rows that
                never shade each other, only on the sunny part of the roof. Sloped roofs get panels flush on the slope.
              </p>
            </div>
            <div className="overflow-hidden rounded-3xl ring-1 ring-ink/10 lg:col-span-7 lg:col-start-6 lg:row-start-1">
              <img src={planImage} alt="Close view of tilted solar panels on legs in rows across a roof, stepping around two stair rooms" loading="lazy" className="aspect-[7/5] w-full origin-[58%_22%] scale-[1.3] object-cover" />
            </div>
          </div>

          <div className="mt-20 grid items-start gap-10 lg:grid-cols-12">
            <div className="rounded-3xl bg-paper-200/70 p-8 ring-1 ring-ink/10 lg:col-span-7">
              <div className="flex items-baseline justify-between border-b border-ink/15 pb-4">
                <span className="font-display text-xl font-semibold">{EXAMPLE.panels} × 330 W polycrystalline</span>
                <span className="text-sm tabular-nums text-ink/60">{EXAMPLE.kwp} kWp</span>
              </div>
              <dl className="divide-y divide-ink/10 text-[15px]">
                {EXAMPLE.cost.map(([label, value, strong]) => (
                  <div key={label} className="flex items-baseline justify-between py-3">
                    <dt className={strong ? 'font-semibold' : 'text-ink/70'}>{label}</dt>
                    <dd className={`tabular-nums ${strong ? 'font-display text-xl font-semibold' : 'font-medium'}`}>{typeof value === 'number' ? `₹${num(value)}` : value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-ink/45">{EXAMPLE.building}. Commercial building, so no subsidy applies.</p>
            </div>
            <div className="lg:col-span-4 lg:col-start-9 lg:pt-6">
              <span className="font-display text-lg italic text-sun-600">03</span>
              <h3 className="mt-2 font-display text-[28px] font-semibold leading-tight">A price you can act on</h3>
              <p className="mt-3 text-pretty leading-[1.7] text-ink/70">
                Panel and installation cost, the PM Surya Ghar subsidy where it applies, savings at your tariff, payback
                and 25-year savings. Save the plan or take it away as a two-page PDF.
              </p>
              <div className="mt-6"><PrimaryLink to="/map">Try it on a building</PrimaryLink></div>
            </div>
          </div>
        </section>

        {/* What the model accounts for: a plain list, not icon cards. */}
        <section className="mx-auto mt-16 max-w-[1240px] px-6 py-20">
          <div className="grid gap-10 border-t border-ink/15 pt-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.01em]">What the model accounts for</h2>
              <p className="mt-4 max-w-sm text-pretty leading-[1.7] text-ink/60">
                Screening estimates, made with the same physics an installer's survey would use. Confirm with a site visit before you buy.
              </p>
            </div>
            <ul className="divide-y divide-ink/10 lg:col-span-8">
              {ACCOUNTS_FOR.map(([title, text]) => (
                <li key={title} className="grid gap-1 py-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8">
                  <span className="font-semibold">{title}</span>
                  <span className="text-pretty leading-[1.65] text-ink/65">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-6 pb-28">
          <div className="grid items-end gap-8 rounded-[32px] bg-paper-200 px-8 py-14 ring-1 ring-ink/10 sm:px-14 lg:grid-cols-12">
            <p className="text-balance font-display text-4xl font-semibold leading-[1.1] tracking-[-0.015em] sm:text-5xl lg:col-span-8">
              Pick a building. <span className="block text-ink/45">It takes about a minute.</span>
            </p>
            <div className="lg:col-span-4 lg:justify-self-end"><PrimaryLink to="/map">Open the 3D map</PrimaryLink></div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-ink/10">
        <div className="mx-auto grid max-w-[1240px] gap-6 px-6 py-10 text-sm text-ink/55 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo />
            <p className="mt-3 max-w-xs">Rooftop solar for Mumbai, building by building. Pilot: F/S ward.</p>
          </div>
          <div className="md:col-span-5">
            <div className="font-semibold text-ink/80">Data</div>
            <p className="mt-2 leading-relaxed">BMC GIS layers served from our own GeoServer · BMC LoD2 buildings and reality mesh · Copernicus DEM GLO-30, corrected to bare earth · NASA POWER sunlight climatology · OpenStreetMap.</p>
          </div>
          <div className="md:col-span-3">
            <div className="font-semibold text-ink/80">Go to</div>
            <ul className="mt-2 space-y-1.5">
              <li><Link to="/map" className="inline-flex items-center gap-1 hover:text-ink">3D map <ArrowUpRight className="h-3.5 w-3.5" /></Link></li>
              <li><Link to="/plans" className="inline-flex items-center gap-1 hover:text-ink">Saved plans <ArrowUpRight className="h-3.5 w-3.5" /></Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
