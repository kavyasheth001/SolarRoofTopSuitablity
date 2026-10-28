import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Gear, Pen, ChartBar, Building, CurrencyDollar, ShieldCheck } from '@phosphor-icons/react';
import '../css/style.css';
import '../css/satoshi.css';

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const marqueeRef = useRef(null);
  const accordionRefs = useRef([]);

  useEffect(() => {
    if (!marqueeRef.current) return;
    const ctx = gsap.context(() => {
      // Infinite marquee for trusted partners
      gsap.to(marqueeRef.current, {
        xPercent: -100,
        ease: 'none',
        duration: 20,
        repeat: -1,
      });
    }, marqueeRef.current);
    return () => ctx.revert();
  }, []);

  return (
    <main className="overflow-x-hidden w-full max-w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Premium Navigation Bar - Floating Glass Pill */}
      <nav className="fixed inset-x-0 top-4 z-50 flex justify-center px-6 pointer-events-none">
        <div className="flex items-center space-x-4 rounded-xl bg-white/20 backdrop-blur-lg pt-2.5 pb-2.5 px-6 shadow-lg pointer-events-all">
          <a href="#" className="flex items-center space-x-2 font-semibold text-white dark:text-gray-100">
            SolarSight
          </a>
          <div className="hidden md:flex space-x-4">
            <a href="/map" className="hover:text-white/80 transition-colors px-3 py-1.5 rounded-md">
              Solar Analysis
            </a>
            <a href="/dashboard" className="hover:text-white/80 transition-colors px-3 py-1.5 rounded-md">
              Dashboard
            </a>
            <a href="#" className="hover:text-white/80 transition-colors px-3 py-1.5 rounded-md">
              About
            </a>
          </div>
          <div className="md:hidden flex items-center space-x-2">
            <button className="p-2 rounded-lg hover:bg-white/30">
              <Gear className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* HERO: Artistic Asymmetry Layout */}
      <section className="pt-24 pb-16 relative min-h-[100dvh] flex items-center">
        <div className="container mx-auto px-6 lg:px-8 flex items-center">
          {/* Text Column - Left */}
          <div className="w-full lg:w-1/2 lg:pr-12">
            <h1 className="max-w-6xl text-4xl md:text-5xl lg:text-6xl font-bold text-white dark:text-gray-100 mb-6 leading-tight">
              SolarSight: Smart Solar Suitability Analysis
            </h1>
            <p className="text-lg text-white/90 dark:text-gray-300 max-w-xl mb-8">
              Analyze rooftop solar potential with AI-powered shadow simulation and financial modeling
            </p>
            <div className="flex space-x-4">
              <a href="/map" className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium transition-shadow hover:shadow-lg flex items-center space-x-2">
                <Building className="h-5 w-5 mr-2" />
                Get Started
              </a>
              <a href="#" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-lg border border-white/20 font-medium flex items-center space-x-2">
                <ChartBar className="h-5 w-5 mr-2" />
                Learn More
              </a>
            </div>
          </div>

          {/* Artistic Floating Image - Overlapping from Bottom Right */}
          <div className="hidden lg:block absolute inset-0 -z-10">
            <div className="absolute bottom-0 right-0 w-[300px] h-[300px] -translate-x-10 translate-y-10">
              <div className="relative h-full w-full overflow-hidden rounded-3xl">
                <img
                  src="https://picsum.photos/seed/solar-roof/800/600"
                  alt="Solar panel installation on modern roof"
                  className="w-full h-full object-cover transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-transparent via-slate-900/30 to-transparent" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTEREST: Features/Bento - Infinite Marquee + Horizontal Accordions + Inline Typography Images */}
      <section className="py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Why Choose SolarSight?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Advanced solar analysis tools designed for accuracy, usability, and actionable insights
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_1fr] gap-8">
            {/* Infinite Marquee - Trusted Partners */}
            <div className="relative overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Trusted by Industry Leaders
              </h3>
              <div className="flex items-center space-x-4" ref={marqueeRef}>
                {/* Repeated partner logos - using icons for demo, replace with real logos */}
                <div className="flex space-x-6">
                  <Gear className="h-8 w-8 text-blue-600" />
                  <Pen className="h-8 w-8 text-green-600" />
                  <ChartBar className="h-8 w-8 text-purple-600" />
                  <Building className="h-8 w-8 text-indigo-600" />
                  <CurrencyDollar className="h-8 w-8 text-amber-600" />
                  <ShieldCheck className="h-8 w-8 text-emerald-600" />
                  {/* Repeat for infinite effect */}
                  <Gear className="h-8 w-8 text-blue-600" />
                  <Pen className="h-8 w-8 text-green-600" />
                  <ChartBar className="h-8 w-8 text-purple-600" />
                  <Building className="h-8 w-8 text-indigo-600" />
                  <CurrencyDollar className="h-8 w-8 text-amber-600" />
                  <ShieldCheck className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Horizontal Accordions */}
            <div className="space-y-6">
              {/* Accordion 1 */}
              <div className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-500">
                <div className="flex items-center justify-between px-6 py-4 cursor-pointer bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Precision Shadow Analysis
                  </h3>
                  <svg className="h-5 w-5 transform transition-transform duration-300 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="hidden group-hover:block overflow-hidden transition-all duration-500 ease-out">
                  <div className="px-6 py-4">
                    <p className="text-gray-700 dark:text-gray-300">
                      Advanced 3D shadow simulation using real building data and solar position algorithms to accurately predict sunlight hours throughout the year.
                    </p>
                    <div className="mt-4 flex items-center space-x-2 text-sm">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      98.7% Accuracy
                    </div>
                  </div>
                </div>
              </div>

              {/* Accordion 2 */}
              <div className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-500">
                <div className="flex items-center justify-between px-6 py-4 cursor-pointer bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Financial Modeling
                  </h3>
                  <svg className="h-5 w-5 transform transition-transform duration-300 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="hidden group-hover:block overflow-hidden transition-all duration-500 ease-out">
                  <div className="px-6 py-4">
                    <p className="text-gray-700 dark:text-gray-300">
                      Comprehensive ROI calculations including payback periods, annual savings, and environmental impact metrics to help make informed investment decisions.
                    </p>
                    <div className="mt-4 flex items-center space-x-2 text-sm">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      23% Avg. Savings
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Typography Images Section */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              SolarSight: <span className="inline-block w-24 h-10 rounded-full align-middle bg-cover bg-center mx-2" style={{backgroundImage: 'url(https://picsum.photos/seed/solar-tech/800/400)'}}></span> Smart <span className="inline-block w-24 h-10 rounded-full align-middle bg-cover bg-center mx-2" style={{backgroundImage: 'url(https://picsum.photos/seed/ai-analysis/800/400)'}}></span> Solar <span className="inline-block w-24 h-10 rounded-full align-middle bg-cover bg-center mx-2" style={{backgroundImage: 'url(https://picsum.photos/seed/financial-planning/800/400)'}}></span> Analysis
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Experience the future of solar technology with AI-powered precision and financial clarity
            </p>
          </div>
        </div>
      </section>

      {/* DESIRE: GSAP Scroll/Media - Scroll Pinning + Hover Physics */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white dark:bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              How SolarSight Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Simple, powerful workflow that turns complex solar analysis into actionable insights
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_1fr] gap-12 items-start">
            {/* Left: Pinned Section Titles */}
            <div className="hidden md:block space-y-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Select</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md">Choose from existing buildings or draw your own structure</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analyze</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md">Run AI-powered shadow and financial simulations</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Results</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md">Get detailed reports with suitability scores and recommendations</p>
              </div>
            </div>

            {/* Right: Scrolling Content */}
            <div className="relative">
              {/* Step 1 */}
              <div className="mb-12">
                <div className="flex items-center space-x-6">
                  <div className="h-16 w-16 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Building className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Select a Building</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Choose from existing buildings in the database or draw your own structure directly on the map interface.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="mb-12">
                <div className="flex items-center space-x-6">
                  <div className="h-16 w-16 bg-green-50 rounded-xl flex items-center justify-center">
                    <ChartBar className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Run Analysis</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Our AI-powered engine simulates sunlight exposure throughout the day and year, accounting for shadows from surrounding buildings and terrain.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="mb-12">
                <div className="flex items-center space-x-6">
                  <div className="h-16 w-16 bg-purple-50 rounded-xl flex items-center justify-center">
                    <CurrencyDollar className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Get Results</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Receive detailed reports with suitability scores, financial projections, and actionable recommendations for your solar investment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GSAP Scroll Pinning Effect */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-200/10 to-transparent" />
          </div>
        </div>
      </section>

      {/* ACTION: Footer/Pricing - Massive High-Contrast CTA */}
      <section className="py-24 bg-blue-600 text-white">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Analyze Your Solar Potential?
            </h2>
            <p className="text-lg max-w-2xl mx-auto mb-8">
              Start with a free analysis to see your property's solar potential and make informed investment decisions.
            </p>
            <a href="/map" className="bg-white text-blue-600 hover:text-blue-800 font-semibold px-8 py-4 rounded-xl transition-shadow hover:shadow-lg flex items-center justify-center space-x-3">
              <Building className="h-6 w-6 mr-2" />
              Launch Free Solar Analysis
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER - Clean Footer Links */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-[1fr_1fr_1fr_1fr] gap-8">
            {/* About */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-white">SolarSight</h3>
              <p className="text-gray-400">
                Advanced solar suitability analysis platform combining AI-powered shadow simulation with financial modeling to optimize solar investments.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-white">Platform</h3>
              <ul className="space-y-2">
                <li><a href="/map" className="hover:text-white transition-colors">Solar Analysis Map</a></li>
                <li><a href="/dashboard" className="hover:text-white transition-colors">Results Dashboard</a></li>
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-white">Features</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Shadow Simulation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Financial Modeling</a></li>
                <li><a href="#" className="hover:text-white transition-colors">What-If Analysis</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Export Reports</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-white">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Data Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Accessibility</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500">
            <p>&copy; 2026 SolarSight. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}