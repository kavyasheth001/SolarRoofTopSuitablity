# Truegeomap - Solar Rooftop Suitability Analysis (SolarSight)

SolarSight is an advanced web-based geospatial application designed to analyze and estimate the solar rooftop suitability of buildings. Built with React, Vite, and cutting-edge 3D mapping technologies, the application provides interactive tools to calculate potential solar capacity, simulate shadow impacts, and generate comprehensive financial and environmental reports.

## 🌟 Key Features

### 🗺️ Interactive 3D Mapping & GIS
- **3D Scene Views:** High-performance 3D visualization of urban environments (focused on Mumbai).
- **LoD (Level of Detail) Models:** Toggleable 3D building models (LoD 2) to accurately represent building structures.
- **Reality Models:** Integration of high-resolution reality meshes for realistic visualization.

### ☀️ Solar Suitability & Shadow Analysis
- **Shadow Simulation:** Calculate building shadow impacts at different times of the day and year to accurately assess sunlit hours.
- **Suitability Scoring:** Automatically calculate a suitability score (out of 100) based on sunlight exposure, usable rooftop area, building height, and irradiance.
- **What-If Impact Analysis:** Simulate the impact of proposed future constructions on a building's solar suitability.
- **Area Heatmaps:** Visual representations of high-potential solar zones.

### 📊 Comprehensive Dashboard & Reporting
- **Metric Calculations:** Instantly calculate Estimated Panel Count, System Capacity (kWp), Annual Generation (kWh), and Usable Area.
- **Financial & Environmental Impact:** Estimates Annual Electricity Savings, Installation Costs, Payback Period, and CO₂ Emission Savings.
- **PDF Report Generation:** Export beautifully formatted PDF reports for any building analyzed, complete with maps and technical metrics.
- **Saved Analyses:** View and compare past analyses from the dashboard.

## 🛠️ Technology Stack

- **Core Frameworks:** React 18, Vite
- **Styling & UI:** TailwindCSS, Styled Components, Heroicons, Lucide React
- **Mapping & GIS:** ArcGIS Maps SDK for JavaScript (`@arcgis/core`), OpenLayers (`ol`), React Google Maps API
- **State Management:** Redux Toolkit, Zustand
- **Charting & Data Viz:** Recharts, ApexCharts, Chart.js
- **Utilities:** jsPDF (for PDF generation), ExcelJS, Date-fns, Axios

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn package manager

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd "c:\Kavya's Work\Truegeomap-solarsuitablity\SolarSuitablity"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

- **Development Server:**
  Run the application locally with hot-module replacement.
  ```bash
  npm run dev
  ```
  The application will typically be available at `http://localhost:5173`.

- **Production Build:**
  Bundle the application for production.
  ```bash
  npm run build
  ```

- **Preview Production Build:**
  ```bash
  npm run preview
  ```

## 📁 Project Structure

- `src/components/Maps/`: Contains all interactive mapping components (`TwoDMap.jsx`, 3D Scene configurations, layers).
- `src/components/Tools/`: GIS toolsets like Shadow Analysis, Solar Suitability, Area Heatmaps, and Scene Identify.
- `src/pages/SolarDashboard.jsx`: The comprehensive analytics dashboard for reviewing, filtering, and exporting saved solar analyses.
- `src/context/` & `src/store/`: Global state management for map states and application data.

## 📝 Usage Guide for Presentation

If you are presenting this project, make sure to highlight the following workflow:
1. **Login/Landing:** Enter the platform via the login screen.
2. **Map Interaction:** Navigate to the 3D Map, toggle on LoD or Reality Models for realism.
3. **Run Analysis:** Use the **Solar Suitability Tool** on a specific building to run a shadow simulation. Point out how it calculates metrics based on geography.
4. **What-If Scenarios:** Showcase the ability to add a simulated building nearby and observe how the score drops due to new shadows.
5. **Dashboard Review:** Navigate to the Dashboard to view the aggregated data (Total Generation, Total Savings) across all analyzed buildings.
6. **Export:** Demonstrate generating a professional PDF report for a client.
