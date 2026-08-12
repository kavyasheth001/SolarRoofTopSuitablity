import { createSlice } from "@reduxjs/toolkit"
import { Network } from "lucide-react"

// Departments data with tool keys & isEnabled flags
export const departments = {
  water: {
    name: "Water",
    tools: [
      { name: "Under Ground", key: "undergroundAnalysis", isEnabled: false },
    ],
  },
  fire: {
    name: "Fire",
    tools: [
      { name: "Fire Incident Analysis", key: "fireIncidentMappingTool", isEnabled: false },
      { name: "Probability of Impact", key: "fireImpactedBuildingsTool", isEnabled: false },
      { name: "Fire Incident Analysis", key: "fireBufferTool", isEnabled: false },
      { name: "Fire Risk ReductionTool", key: "fireRiskReductionTool", isEnabled: false },
      { name: "Vulnerability Analysis", key: "glassFacadeHeightTool", isEnabled: false },
      { name: "Population Density Encroachment", key: "populationdensityencroachment", isEnabled: false },
      { name: "Fire Brigade Network", key: "fireBrigadeNetwork", isEnabled: false },
      { name: "Fire Stations Inventory", key: "fireStationsInventory", isEnabled: false },
      // { name: "Spatial Analysis", key: "spatialAnalysis", isEnabled: false },
    ],
  },
  assessment: {
    name: "Assessment",
    tools: [
      { name: "Building Usage", key: "buildingUsageWidget", isEnabled: false },
      { name: "Building Type", key: "buildingConstructionWidget", isEnabled: false },
      { name: "Building Area", key: "buildingAreaWidget", isEnabled: false },
      { name: "Building Floor", key: "buildingFloorWidget", isEnabled: false },
      // { name: "Building Floor Diff", key: "buildingFloorDiffWidget", isEnabled: false },
      { name: "Tax Property Demand", key: "buildingPropertyTaxWidget", isEnabled: false },
      { name: "Building Property Outstanding", key: "propertyoutstanding", isEnabled: false },
      { name: "SAC Classification", key: "sacClassificationWidget", isEnabled: false },
      { name: "Shops And Establishments", key: "gumastaPendingWidget", isEnabled: false },
      // { name: "Revenue Pending", key: "revenuePendingWidget", isEnabled: false },
      { name: "License Validation", key: "licenseValidation", isEnabled: false },
      // { name: "Find License", key: "findlicense", isEnabled: false },
      { name: "Population Density Encroachment", key: "populationdensityencroachment", isEnabled: false },
      { name: "Metered Properties", key: "meteredProperties", isEnabled: false },
      // { name: "Find Cell Tower", key: "celltower",  isEnabled: false },
      // { name: "Urban Planning", key: "urbanPlanning", isEnabled: false },
      { name: "Tax Zone Mapping Heatmap", key: "taxRateZoneMapping", isEnabled: false },
      { name: "Multiple Criteria Evaluation (MCE)", key: "multiplecriteriaevaluation", isEnabled: false }


    ],
  },
  building: {
    name: "Building",
    tools: [
      { name: "Impact Analysis", key: "Impactalalysis", isEnabled: false },
      { name: "3D Building Tool", key: "building3DWidget", isEnabled: false },
      { name: "Cts Classification", key: "CtsClassification", isEnabled: false },
      { name: "Cts Analysis", key: "ctsAnalysis", isEnabled: false },
      { name: "Reservation Status", key: "reservationStatus", isEnabled: false },
      { name: "Population Heatmap", key: "populationHeatmap", isEnabled: false },
      { name: "Urban Planning", key: "urbanPlanning", isEnabled: false },
      { name: "Slum Encroachment", key: "slumEncroachment", isEnabled: false },
      { name: "Land Use Analysis Widget", key: "landUseAnalysisWidget", isEnabled: false },
      { name: "Development Plan Network", key: "developmentPlanNetwork", isEnabled: false },
    ],
  },
  road: {
    name: "road",
    tools: [
      { name: "Impact Analysis", key: "Impactalalysis", isEnabled: false },
      { name: "Bridge Connected", key: "Bridgealysis", isEnabled: false },
      { name: "Services Near Bridge", key: "Emergencyalysis", isEnabled: false },
      { name: "Road Construction Material Analysis", key: "roadConstructionMaterial", isEnabled: false },
      { name: "Walkable Pedestrian", key: "walkabilityAnalysis", isEnabled: false },
      { name: "Logistics Routing", key: "logisticsrouting", isEnabled: false },
      { name: "Road Proximity", key: "roadProximityAnalysis", isEnabled: false },
      { name: "Manhole Detection", key: "manholeDetection", isEnabled: false },
    ],
  },
  bridge: {
    name: "Bridge",
    tools: [
      { name: "Impact Analysis", key: "Impactalalysis", isEnabled: false },
      { name: "Bridge Connected", key: "Bridgealysis", isEnabled: false },
      { name: "Services Near Bridge", key: "Emergencyalysis", isEnabled: false },
      { name: "Road Construction Material Analysis", key: "roadConstructionMaterial", isEnabled: false },
      { name: "Walkable Pedestrian", key: "walkabilityAnalysis", isEnabled: false },
      { name: "Logistics Routing", key: "logisticsrouting", isEnabled: false },
      { name: "Road Proximity", key: "roadProximityAnalysis", isEnabled: false },
      { name: "Manhole Detection", key: "manholeDetection", isEnabled: false },
    ],
  },
  tree: {
    name: "Tree",
    tools: [
      { name: "Plantation Scope Tool", key: "plantationScopeTool", isEnabled: false },
      { name: "Green Coverage Tool", key: "greenCoverageTool", isEnabled: false },
      { name: "Road Green Coverage", key: "roadGreenCoverageTool", isEnabled: false },
      { name: "Park Green Coverage", key: "parkGreenCoverageTool", isEnabled: false },
      { name: "Park Reservation Intersection", key: "parkReservationIntersection", isEnabled: false },
      { name: "Tree Point Analysis", key: "treePointAnalysis", isEnabled: false },
      { name: "Slum Encroachment", key: "slumEncroachment", isEnabled: false },
      { name: "Walkable Pedestrian", key: "walkabilityAnalysis", isEnabled: false },
      { name: "Garden Slum Encroachment", key: "gardenSlumEncroachment", isEnabled: false },
    ],
  },
  environment: {
    name: "Environment",
    tools: [
      { name: "Silent Zone Analysis", key: "silentZoneAnalysis", isEnabled: false },
      { name: "Renewal Energy", key: "showRenewal", isEnabled: false },
      { name: "Air Quality Density Map", key: "airQuality", isEnabled: false },
      { name: "Pollution Source Identification", key: "pollutionSource", isEnabled: false },
      { name: "Plantation Scope Tool", key: "plantationScopeTool", isEnabled: false },
      { name: "Tree Point Analysis", key: "treePointAnalysis", isEnabled: false },
      { name: "Solar Panel Point", key: "solarPanelPoint", isEnabled: false },
      { name: "Environment Department Network", key: "environmentNetwork", isEnabled: false },
    ],
  },
  license: {
    name: "License",
    tools: [
      { name: "Emergency Hoardings", key: "emergencyHoardingsTool", isEnabled: false },
      { name: "License Validation", key: "licenseValidation", isEnabled: false },
      { name: "Hoardings Heatmap", key: "hoardingsHeatmap", isEnabled: false },
      { name: "Trade Licence Heatmap", key: "TradeLicenceHeatmap", isEnabled: false }
    ],
  },
  "solid waste": {
    name: "Solid Waste",
    tools: [
      { name: "High Density Waste Disposal Area", key: "dumpingGrounds", isEnabled: false },
      { name: "SWM Vehicles", key: "swdVehicles", isEnabled: false },
      { name: "Garbage Collection Points info", key: "garbageCollectionPoint", isEnabled: false },
      { name: "Sanitary Analysis", key: "sanitaryAnalysis", isEnabled: false },
      { name: "Dump Routing", key: "dumprouting", isEnabled: false },
      { name: "High-Density Waste Area Identification", key: "GCPHeatmap", isEnabled: false },
      { name: "Solid Waste Reservation", key: "SolidWasteReservation", isEnabled: false },
      { name: "SWM Network", key: "SolidWasteNetwork", isEnabled: false },
    ],
  },
  disaster: {
    name: "Disaster",
    tools: [
      // { name: "Flood Zone Identification", key: "showFloodAnalysis", isEnabled: false },
      { name: "Flood Simulation", key: "floodsimulation", isEnabled: false },
      { name: "Tsunami Impact Analysis", key: "floodImpactAnalysis", isEnabled: false },
      // { name: "Flood Impact Analysis", key: "floodImpactAnalysis", isEnabled: false },
      { name: "CCTV Monitoring", key: "cctvDialog", isEnabled: false },
      { name: "Dark Spot Analysis", key: "darkSpotTool", isEnabled: false },
      { name: "FloodingSpot Analysis", key: "floodingSpots", isEnabled: false },
      { name: "Incident Analysis", key: "incidentAnalysis", isEnabled: false },
      { name: "Fire Incident Mapping", key: "fireIncidentMappingTool", isEnabled: false },
      { name: "Probability of Impact", key: "fireImpactedBuildingsTool", isEnabled: false },
      { name: "Landslide Prone Areas", key: "landslideProneAreas", isEnabled: false },
      // { name: "Fire Risk ReductionTool", key: "fireRiskReductionTool", isEnabled: false },
      { name: "Disaster Management Network", key: "disasterNetwork", isEnabled: false },
      { name: "Disaster Impact Tool", key: "DisasterImpactTool", isEnabled: false },
    ],
  },
  buid: {
    name: "BUID",
    tools: [
      { name: "BUID Identification", key: "showbuid", isEnabled: false },
      { name: "Flood Simulation", key: "floodsimulation", isEnabled: false },
      { name: "Flood Impact Analysis", key: "floodImpactAnalysis", isEnabled: false },
      { name: "Property Validation Checker", key: "propertyValidationChecker", isEnabled: false },
      { name: "License Validation", key: "licenseValidation", isEnabled: false },
      { name: "SAC Classification", key: "sacClassificationWidget", isEnabled: false },
      { name: "Building Floor", key: "buildingFloorWidget", isEnabled: false },
      { name: "Population Density Encroachment", key: "populationdensityencroachment", isEnabled: false },
      { name: "Slum Encroachment", key: "slumEncroachment", isEnabled: false },
      { name: "3D Building Tool", key: "building3DWidget", isEnabled: false },
      { name: "Urban Planning", key: "urbanPlanning", isEnabled: false },
      { name: "Impact Analysis", key: "Impactalalysis", isEnabled: false },
      { name: "Road Proximity", key: "roadProximityAnalysis", isEnabled: false },
      { name: "Building Info Tool", key: "buildingInfoTool", isEnabled: false },
    ],
  },
  storm: {
    name: "Storm",
    tools: [
      { name: "Flood Simulation", key: "floodsimulation", isEnabled: false },
      { name: "Flood Impact Analysis", key: "floodImpactAnalysis", isEnabled: false },
      { name: "Flooding Areas at Risk", key: "floodingSpots", isEnabled: false },
      { name: "SWD Slum Encroachment", key: "swdXSlum", isEnabled: false },
      { name: "Storm Water Drainage Network", key: "swdNetwork", isEnabled: false },
      { name: "River Retaining Wall", key: "riverRetainingWall", isEnabled: false },

      // { name: "Reservations", key: "reservations", isEnabled: false },

    ],
  },
  roe: {
    name: "ROE",
    tools: [
      { name: "Population Heatmap", key: "populationHeatmapDensity", isEnabled: false },
      { name: "Agriculture Encroachment", key: "agricultureEncroachment", isEnabled: false },
      { name: "Slum Encroachment", key: "slumEncroachment", isEnabled: false },
      { name: "Important Buildings", key: "importantBuildings", isEnabled: false },
    ],
  },
  sewerage: {
    name: "Sewerage Operation",
    tools: [
      { name: "Sewerage Network Points", key: "sewerageNetworkPoints", isEnabled: false },
      { name: "Pumping Stations", key: "pumpingStations", isEnabled: false },
    ],
  }
}

// Initial state with deep copy of departments to avoid direct mutation
const initialState = {
  activeDepartment: null,
  departments: JSON.parse(JSON.stringify(departments)),
}

const departmentSlice = createSlice({
  name: "departmentTool",
  initialState,
  reducers: {
    setActiveDepartment: (state, action) => {
      const newDept = action.payload

      // Disable all tools from the previous department
      if (state.activeDepartment && state.departments[state.activeDepartment]) {
        state.departments[state.activeDepartment].tools.forEach((tool) => {
          tool.isEnabled = false
        })
      }

      state.activeDepartment = newDept
    },

    selectTool: (state, action) => {
      const { department, toolKey } = action.payload;

      // Find currently enabled tool (if any) across all departments
      let currentlyEnabledTool = null;
      let currentlyEnabledDept = null;

      for (const [deptKey, dept] of Object.entries(state.departments)) {
        const enabledTool = dept.tools.find((tool) => tool.isEnabled);
        if (enabledTool) {
          currentlyEnabledTool = enabledTool;
          currentlyEnabledDept = deptKey;
          break; // Found enabled tool, stop searching
        }
      }

      if (
        currentlyEnabledTool &&
        currentlyEnabledDept === department &&
        currentlyEnabledTool.key === toolKey
      ) {
        // Same tool clicked again -> toggle it OFF
        currentlyEnabledTool.isEnabled = false;
      } else {
        // Different tool clicked -> disable all tools first
        Object.values(state.departments).forEach((dept) => {
          dept.tools.forEach((tool) => {
            tool.isEnabled = false;
          });
        });

        // Enable the newly selected tool
        const tools = state.departments[department]?.tools || [];
        const selectedTool = tools.find((tool) => tool.key === toolKey);
        if (selectedTool) {
          selectedTool.isEnabled = true;
        }
      }
    },

    resetDepartment: (state, action) => {
      const department = action.payload
      if (state.departments[department]) {
        state.departments[department].tools.forEach((tool) => {
          tool.isEnabled = false
        })
      }
    },

    clearAllSelections: (state) => {
      Object.values(state.departments).forEach((dept) => {
        dept.tools.forEach((tool) => {
          tool.isEnabled = false
        })
      })
      state.activeDepartment = null
    },
  },
})

export const { setActiveDepartment, selectTool, resetDepartment, clearAllSelections } = departmentSlice.actions

export default departmentSlice.reducer