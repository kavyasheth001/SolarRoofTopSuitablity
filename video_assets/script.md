# SolarSight Motion Graphic Video Script

## Overview
- **Duration:** 2 minutes 30 seconds
- **Style:** Clean, professional, with 3D animations and smooth transitions
- **Voice-over:** Clear, energetic, and informative
- **Captions:** Synchronized with voice-over

---

## Scene-by-Scene Breakdown

### Scene 1: Introduction (0:00-0:20)
**Visuals:**
- Aerial view of Mumbai cityscape (3D model) with buildings.
- Zoom into a dense urban area showing rooftops.
- Text overlay: "Mumbai has over 12,500 mapped buildings. Manually assessing rooftop solar suitability is infeasible at scale."
**Voice-over:**
"Mumbai’s skyline is dotted with thousands of rooftops, each a potential site for solar energy. But manually evaluating each building for solar panel installation—considering roof area, shadow from neighboring high-rises, orientation, and sunlight hours—is simply impossible at scale."

### Scene 2: Solution Overview (0:20-0:40)
**Visuals:**
- Transition to the SolarSight interface: a 3D map of Mumbai with a building selected.
- Animated lines showing data points: shadow analysis, solar score, financials.
- Text overlay: "SolarSight: AI-Powered Rooftop Solar Suitability Analysis"
**Voice-over:**
"Enter SolarSight—an intelligent geospatial tool that automates this process. By combining ArcGIS Enterprise's 3D city model with real-time shadow simulation, SolarSight computes a solar suitability score, estimates energy generation, and projects financial savings—in seconds."

### Scene 3: How It Works (0:40-1:40)
We break down the key features with quick animations.

#### 3.1 3D Shadow Analysis (0:40-0:55)
**Visuals:**
- Side view of a building with the sun moving across the sky from 6 AM to 6 PM.
- Animated shadows cast by neighboring buildings onto the rooftop.
- A graph showing hourly sunlight percentage.
- Text overlay: "Simulates sun position across the year using ArcGIS SceneView's ShadowAccumulation"
**Voice-over:**
"First, SolarSight simulates the sun’s position for every hour of daylight. It calculates the shadow cast by surrounding buildings on each rooftop, determining the percentage of area under shadow and deriving the 'sunny hours' metric."

#### 3.2 Solar Suitability Score (0:55-1:10)
**Visuals:**
- A gauge animating from 0 to a score (e.g., 77) with color changes (red to yellow to green).
- Breakdown of the score components: sunlit fraction, area, height, irradiance.
- Text overlay: "Score = (Sunlit % × 0.5) + (Area × 0.2) + (Height × 0.1) + (Irradiance × 0.2)"
**Voice-over:**
"The tool then computes a composite Solar Suitability Score from 0 to 100, weighting sunlit exposure at 50%, roof area at 20%, building height at 10, and solar irradiance at 20. Scores are categorized as Suitable (60–100), Moderately Suitable (35–59), or Unsuitable (0–34)."

#### 3.3 Financial & Environmental Projections (1:10-1:25)
**Visuals:**
- Icons flashing: kilowatt (kWp), rupee (₹), CO₂ molecule, clock.
- Animated numbers: capacity (kWp), annual generation (MWh/yr), savings (₹/yr), payback period (years), CO₂ offset (tonnes/yr).
- Text overlay: "Capacity • Generation • Savings • Payback • CO₂ Offset"
**Voice-over:**
"From the score, SolarSight estimates the system’s capacity in kilowatts-peak, annual energy generation, financial savings based on local tariffs, payback period, and carbon offset using India’s grid emission factor."

#### 3.4 What-If Simulation (1:25-1:40)
**Visuals:**
- Split screen: left shows current rooftop with shadows from neighbors; right shows the same rooftop without neighboring buildings.
- Animated comparison: score drops from 77 to 59 when neighbors are present.
- Text overlay: "What-If: 77/100 without neighbors → 59/100 actual (−18 pts)"
**Voice-over:**
"Users can run a What-If simulation to see how much shadow from neighboring buildings affects the score. This helps planners identify where tall neighbors are the limiting factor and prioritize interventions."

### Scene 4: Analysis Dashboard (1:40-1:55)
**Visuals:**
- Dashboard view: cards for each analyzed building showing score, suitability tag, and metrics.
- Filtering and sorting controls.
- PDF export button on a building card.
- Text overlay: "Analysis Dashboard • Filter • Sort • PDF Export"
**Voice-over:**
"All analyzed buildings are saved to an interactive dashboard. Users can filter by name, sort by score or date, and export a branded PDF report for each building—complete with a 3D screenshot, metrics, and projection tables."

### Scene 5: Technical Architecture (1:55-2:05)
**Visuals:**
- Simple architecture diagram: Frontend (React/Vite, ArcGIS JS API) → Backend (Node.js/Express, PostgreSQL) → Data Sources (3D LOD2 model, Ward boundaries, Reality Mesh, Tariff rates, Emission factor).
- Text overlay: "Built on the TrueGeoMap Platform"
**Voice-over:**
"SolarSight is built as a tool within the TrueGeoMap platform, using React and Vite for the frontend, ArcGIS JS API for 3D rendering and shadow analysis, and a Node.js/Express backend with PostgreSQL for saving analyses. It leverages the platform’s existing authentication, routing, and export utilities."

### Scene 6: Use Cases & Impact (2:05-2:20)
**Visuals:**
- Icons representing: municipal planner, citizen, developer, urban planner.
- Map of Mumbai wards lighting up as each use case is mentioned.
- Text overlay: "Policy • Citizen Portal • Developer Feasibility • Urban Planning"
**Voice-over:**
"SolarSight supports multiple use cases: municipal officers can target incentives to wards with high solar potential; citizens can check their rooftop score before applying for net metering; solar EPC companies can run quick feasibility checks; and urban planners can factor rooftop solar into new development approvals."

### Scene 7: Call to Action (2:20-2:30)
**Visuals:**
- The SolarSight interface with a button labeled "Analyze Your Rooftop".
- Animated pulse on the button.
- Text overlay: "Try SolarSight Today"
**Voice-over:**
"With SolarSight, Mumbai’s solar potential is just a click away. Discover how your rooftop can contribute to a greener, more sustainable city."

## Visual Style Notes
- **Color Palette:** Use the project’s existing colors: deep blue (#1e3a5f) for headers, green (#10b981) for positive metrics, amber (#f59e0b) for moderate, red (#ef4444) for low scores.
- **Typography:** Clean, sans-serif (e.g., Inter or Helvetica).
- **3D Elements:** Use realistic building models with textures for shadow simulation; keep animations smooth and physically accurate.
- **Transitions:** Use wipes, fades, and zooms to maintain flow.
- **Data Visualization:** Use rechargearts-style charts for hourly sunlight and score breakdowns.

## Voice-over Script (Full)
[To be generated separately in voiceover.txt]
