import { useDispatch, useSelector } from "react-redux"
import { useEffect, useState } from "react"
import { setActiveDepartment, selectTool, resetDepartment } from "../../store/features/department/departmentSlice"
import { WiFlood, WiTsunami } from "react-icons/wi"
import underground from '../../images/logo/Underground.svg';
import BUID from '../../images/logo/BUID.svg';
import plantationScopeIcon from '../../images/logo/PlantationScope-01.svg';
import SanitaryAnalysis from '../../images/logo/SanitaryAnalysis.svg';
import CTSClassification from '../../images/logo/CTSClassification.svg';
import PropertyValidationChecker from '../../images/logo/PropertyValidationChecker.svg';
import disasterIcon from '../../images/logo/DisasterManagement.svg';
import greencoverage from '../../images/logo/GreenCoverage.svg';
import highdensity from '../../images/logo/Highdensity.svg';
import BuildingFire from '../../images/logo/BuildingFire.svg';
import FireTruckIcon from '../../images/logo/FireTruckIcon.svg';
import Property from '../../images/logo/proptax.svg';
import gumasta from '../../images/logo/gumasta.svg';
import BridgeIcon from '../../images/logo/BridgeIcon-01.svg';
import Impact from '../../images/logo/Zoommmm.svg';
import RoadIcon from '../../images/logo/RoadIcon.svg';
import BuildingIcon2 from '../../images/logo/BuildingIcon2.svg';
import Construction from '../../images/logo/Construction.svg';
import BuildingArea from '../../images/logo/BuildingArea.svg';
import floor from '../../images/logo/floors.svg';
import flooding from '../../images/logo/FloodZoneIdentifaction.svg';
import Roadmaterial from '../../images/logo/road_construction_material.svg';
import ResidenceIcon from '../../images/logo/ResidenceIcon.svg';
import sac_clarification from '../../images/logo/sac_clarification-01.svg';
import find from '../../images/logo/find_l.svg';
import Garbage from '../../images/logo/Garbage_collection_point.svg';
import Heatmap from '../../images/logo/Heat_Map.svg';
import Flooda from '../../images/logo/FloodSimulation.svg';
import Floods from '../../images/logo/Flood_s.svg';
import Manhole from '../../images/logo/ManholeDetection.svg';
import WalkablePederistian from '../../images/logo/WalkablePederistian.svg';
import BuildingPlacementIcon from '../../images/logo/BuildingPlacementIcon.svg';
import DumpRouting from '../../images/logo/DumpRouting.svg';
import Reservartions from '../../images/logo/Reservartions.svg';
import SlumEncroachement from '../../images/logo/SlumEncroachement.svg';
import PopulationDensityEncroachement from '../../images/logo/PopulationDensityEncroachement.svg';
import FireRiskReductionTool from '../../images/logo/FireRiskReductionTool.svg';
import Populationheatmap from '../../images/logo/Populationheatmap.svg';
import urbanplanningicon from '../../images/logo/urbanplanningicon.svg';
import { GiFalling, GiFlood, GiMountains, GiRiver, GiRoad, GiTreeBranch, GiWoodenSign } from "react-icons/gi";
import { BsBuildingsFill } from "react-icons/bs";
import { SlEnergy } from "react-icons/sl";
import { PiParkDuotone, PiTruckThin } from "react-icons/pi";
import { GiWheat } from "react-icons/gi";
import { MdAir, MdAnalytics, MdGradient, MdLandscape, MdNature, MdOutlineLocationCity, MdOutlinePark, MdOutlineWater, MdWater, MdWhatshot } from "react-icons/md";
import { FaCampground, FaFire, FaMapMarkerAlt, FaTree, FaTruck, FaVolumeDown, FaVideo, FaExclamationTriangle, FaRegBuilding, FaSolarPanel } from "react-icons/fa";
import { GrValidate } from "react-icons/gr";
import { RiBuilding2Line } from "react-icons/ri";

import { useMap } from "../../context/MapContext";
import { TbGauge, TbMapPinCheck, TbTruckLoading } from "react-icons/tb";
import { MdOutlineFlood } from "react-icons/md";

import {
  FaWater,
  FaFireAlt,
  FaFileInvoiceDollar,
  FaRoad,
  FaBuilding,
  FaLeaf,
  FaIdCard,
  FaTrash,
  FaBarcode,
} from "react-icons/fa";

import {
  MdFlood,
  MdRemoveCircleOutline,
} from "react-icons/md";
import { IoWater } from "react-icons/io5";
import { LandPlot } from "lucide-react";


// Helper function to render icons
const renderIcon = (icon, size = 27) => {
  // Handle React components (like WiFlood)
  if (typeof icon !== 'string' && typeof icon !== 'object') {
    return icon;
  }

  // Handle React elements (JSX)
  if (typeof icon === 'object' && icon.$$typeof) {
    return icon;
  }

  // Handle emoji or short text strings
  if (typeof icon === 'string' && icon.length <= 4) {
    return <span style={{ fontSize: size }}>{icon}</span>;
  }

  // Handle image paths (imported SVGs)
  if (typeof icon === 'string' && icon.length > 4) {
    return (
      <img
        src={icon}
        alt="icon"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
        }}
      />
    );
  }

  return null;
};

const DepartmentTool = ({ isMapRoute, isDepartmentOpen, setIsDepartmentOpen }) => {

  const dispatch = useDispatch()
  const { departments: reduxDepartments, activeDepartment } = useSelector((state) => state.departmentTool)
  const { sceneView } = useMap()
  const [userRole, setUserRole] = useState("");
  const [userDepartment, setUserDepartment] = useState("");

  useEffect(() => {
    console.log(isDepartmentOpen, 'isDepartmentOpen');
  }, [setIsDepartmentOpen, isDepartmentOpen])

  const decodeToken = (token) => {
    try {
      const base64Payload = token.split(".")[1]; // Get payload part
      const payload = atob(base64Payload);       // Decode base64
      return JSON.parse(payload);                // Parse JSON
    } catch (e) {
      return null;
    }
  };
  const token = localStorage.getItem("token");
  const user = token ? JSON.stringify(decodeToken(token)) : null;

  useEffect(() => {
    if (user) {
      const parsedUser = JSON.parse(user);
      setUserRole(parsedUser?.role?.trim().toLowerCase() || "");
      setUserDepartment(parsedUser?.tag?.trim().toLowerCase() || "");
    }
  }, [user]);

  // Enhanced Department data with tools - including conditional rendering
  const departments = [
    {
      title: "Hydraulic Engineering",
      name: "Water",
      icon: <FaWater size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Water Management",
      tools: [
        { name: "Under Ground", key: "undergroundAnalysis", icon: underground },
      ],
    },

    {
      title: "Fire Brigade",
      name: "Fire",
      icon: <FaFireAlt size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Fire Department",
      tools: [
        { name: "Fire Emergency Response", key: "fireIncidentMappingTool", icon: <FaFire size={20} /> },
        { name: "Probability of Impact", key: "fireImpactedBuildingsTool", icon: BuildingFire },
        { name: "Fire Incident Analysis", key: "fireBufferTool", icon: FireTruckIcon },
        { name: "Fire Risk ReductionTool", key: "fireRiskReductionTool", icon: FireRiskReductionTool },
        { name: "Vulnerability Analysis", key: "glassFacadeHeightTool", icon: <RiBuilding2Line /> },
        { name: "Population Density Encroachment", key: "populationdensityencroachment", icon: PopulationDensityEncroachement },
        { name: "Fire Brigade Network", key: "fireBrigadeNetwork", icon: PopulationDensityEncroachement },
        { name: "Fire Stations Inventory", key: "fireStationsInventory", icon: <FaCampground size={20} /> },
      ],
    },

    {
      title: "Assessment & Collection",
      name: "Assessment",
      icon: <FaFileInvoiceDollar size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Property Assessment",
      tools: [
        { name: "Building Usage", key: "buildingUsageWidget", icon: BuildingIcon2 },
        { name: "Building Construction Type", key: "buildingConstructionWidget", icon: Construction },
        { name: "Building Area", key: "buildingAreaWidget", icon: BuildingArea },
        { name: "Building Floor", key: "buildingFloorWidget", icon: floor },
        { name: "Tax Property Demand", key: "buildingPropertyTaxWidget", icon: Property },
        { name: "Building Property Outstanding", key: "propertyoutstanding", icon: <FaRegBuilding /> },
        { name: "SAC Classification", key: "sacClassificationWidget", icon: sac_clarification },
        { name: "Shops And Establishments", key: "gumastaPendingWidget", icon: gumasta },
        { name: "License Validation", key: "licenseValidation", icon: <GrValidate /> },
        // { name: "Find License", key: "findlicense", icon: find },
        { name: "Population Density Encroachment", key: "populationdensityencroachment", icon: PopulationDensityEncroachement },
        { name: "Metered Properties", key: "meteredProperties", icon: <IoWater /> },
        // { name: "Urban Planning", key: "urbanPlanning", icon: urbanplanningicon },
        { name: "Tax Zone Mapping Heatmap", key: "taxRateZoneMapping", icon: <MdGradient /> },
        { name: "Multiple Criteria Evaluation (MCE)", key: "multiplecriteriaevaluation", icon: urbanplanningicon }
      ],
    },
    {
      title: "Roads",
      name: "Road",
      icon: <FaRoad size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Road Infrastructure",
      tools: [
        { name: "Impact Analysis", key: "Impactalalysis", icon: Impact },
        { name: "Bridge Connected To Road", key: "Bridgealysis", icon: RoadIcon },
        { name: "Services Near Bridge", key: "Emergencyalysis", icon: BridgeIcon },
        { name: "Road Construction Material Analysis", key: "roadConstructionMaterial", icon: Roadmaterial },
        { name: "Walkable Pedestrian", key: "walkabilityAnalysis", icon: WalkablePederistian },
        { name: "Logistics Routing", key: "logisticsrouting", icon: <PiTruckThin /> },
        { name: "Road Proximity", key: "roadProximityAnalysis", icon: "P" },
        { name: "Manhole Detection", key: "manholeDetection", icon: Manhole },
      ],
    },
    {
      title: "Bridge",
      name: "Bridge",
      icon: <FaRoad size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Bridge Infrastructure",
      tools: [
        { name: "Impact Analysis", key: "Impactalalysis", icon: Impact },
        { name: "Bridge Connected To Road", key: "Bridgealysis", icon: RoadIcon },
        { name: "Services Near Bridge", key: "Emergencyalysis", icon: BridgeIcon },
        { name: "Road Construction Material Analysis", key: "roadConstructionMaterial", icon: Roadmaterial },
        { name: "Walkable Pedestrian", key: "walkabilityAnalysis", icon: WalkablePederistian },
        { name: "Logistics Routing", key: "logisticsrouting", icon: <PiTruckThin /> },
        { name: "Road Proximity", key: "roadProximityAnalysis", icon: "P" },
        { name: "Manhole Detection", key: "manholeDetection", icon: Manhole },
      ],
    },

    {
      title: "Garden & Trees",
      name: "Tree",
      icon: <FaTree size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Tree Management",
      tools: [
        { name: "Plantation Scope Tool", key: "plantationScopeTool", icon: plantationScopeIcon },
        { name: "Green Coverage Tool", key: "greenCoverageTool", icon: greencoverage },
        { name: "Road Green Coverage", key: "roadGreenCoverageTool", icon: <GiTreeBranch size={22} /> },
        { name: "Park Green Coverage", key: "parkGreenCoverageTool", icon: <MdOutlinePark size={22} /> },
        { name: "Park Reservation Intersection", key: "parkReservationIntersection", icon: <PiParkDuotone size={22} /> },
        { name: "Tree Point Analysis", key: "treePointAnalysis", icon: Heatmap },
        { name: "Slum Encroachment", key: "slumEncroachment", icon: SlumEncroachement },
        { name: "Walkable Pedestrian", key: "walkabilityAnalysis", icon: WalkablePederistian },
        { name: "Garden Slum Encroachment", key: "gardenSlumEncroachment", icon: SlumEncroachement }
      ],
    },

    {
      title: "Development Planning",
      name: "Building",
      icon: <FaBuilding size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Building Analysis",
      tools: [
        { name: "Impact Analysis", key: "Impactalalysis", icon: Impact },
        { name: "3D Building Placement Tool", key: "building3DWidget", icon: BuildingPlacementIcon },
        { name: "Cts Classification", key: "CtsClassification", icon: CTSClassification },
        { name: "Cts Analysis", key: "ctsAnalysis", icon: <MdAnalytics size={32} /> },
        { name: "Reservation Status", key: "reservationStatus", icon: <TbMapPinCheck size={22} /> },
        { name: "Population Heatmap", key: "populationHeatmap", icon: Populationheatmap },
        { name: "Urban Planning", key: "urbanPlanning", icon: urbanplanningicon },
        { name: "Encroachment Analysis", key: "slumEncroachment", icon: SlumEncroachement },
        { name: "Land Use Analysis Widget", key: "landUseAnalysisWidget", icon: <LandPlot /> },
        { name: "Development Plan Network", key: "developmentPlanNetwork", icon: "P" },
      ],
    },

    {
      title: "Environment Department",
      name: "Environment",
      icon: <FaLeaf size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Environmental Analysis",
      tools: [
        { name: "Silent Zone Analysis", key: "silentZoneAnalysis", icon: Populationheatmap },
        { name: "Renewal Energy", key: "showRenewal", icon: <SlEnergy size={20} /> },
        { name: "Air Quality Density Map", key: "airQuality", icon: <MdAir /> },
        { name: "Pollution Source Identification", key: "pollutionSource", icon: "P" },
        { name: "Plantation Scope Tool", key: "plantationScopeTool", icon: plantationScopeIcon },
        { name: "Tree Point Analysis", key: "treePointAnalysis", icon: Heatmap },
        { name: "Solar Panel Point", key: "solarPanelPoint", icon: <FaSolarPanel size={20} /> },
        { name: "Environment Department Network", key: "environmentNetwork", icon: <MdNature size={20} /> },
      ],
    },

    {
      title: "License Department",
      name: "License",
      icon: <FaIdCard size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "License Management",
      tools: [
        { name: "Emergency Hoardings", key: "emergencyHoardingsTool", icon: <GiWoodenSign /> },
        { name: "License Validation", key: "licenseValidation", icon: <GrValidate /> },
        { name: "Hoardings Heatmap", key: "hoardingsHeatmap", icon: Populationheatmap },
        { name: "Trade Licence Heatmap", key: "TradeLicenceHeatmap", icon: Populationheatmap }

      ],
    },

    {
      title: "Solid Waste Management Department",
      name: "Solid Waste",
      icon: <FaTrash size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Dumping Grounds Analysis",
      tools: [
        { name: "High Density Waste Disposal Area", key: "dumpingGrounds", icon: highdensity },
        { name: "SWM Vehicles", key: "swdVehicles", icon: <FaTruck size={20} /> },
        { name: "Garbage Collection Points info", key: "garbageCollectionPoint", icon: Garbage },
        { name: "Sanitary Analysis", key: "sanitaryAnalysis", icon: SanitaryAnalysis },
        { name: "DumpRouting", key: "dumprouting", icon: DumpRouting },
        { name: "High-Density Waste Area Identification", key: "GCPHeatmap", icon: Populationheatmap },
        { name: "Solid Waste Reservation", key: "SolidWasteReservation", icon: Reservartions },
        { name: "SWM Network", key: "SolidWasteNetwork", icon: highdensity },
      ],
    },

    {
      title: "Disaster Management",
      name: "Disaster",
      icon: <FaExclamationTriangle size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Disaster Management & Safety",
      tools: [
        { name: "Flood Simulation", key: "floodsimulation", icon: Flooda },
        { name: "Tsunami Impact Analysis", key: "floodImpactAnalysis", icon: <WiTsunami size={34} /> },
        // { name : "Flood Impact Analysis" ,key:"floodImpactAnalysis",icon: Floods},
        { name: "CCTV Monitoring", key: "cctvDialog", icon: <FaVideo size={20} /> },
        { name: "Dark Spot Analysis", key: "darkSpotTool", icon: <FaExclamationTriangle size={20} /> },
        { name: "FloodingSpot Analysis", key: "floodingSpots", icon: <MdOutlineFlood size={20} /> },
        { name: "Incident Analysis", key: "incidentAnalysis", icon: <FaFire size={20} /> },
        { name: "Fire Incident Analysis", key: "fireIncidentMappingTool", icon: FireTruckIcon },
        { name: "Probability of Impact", key: "fireImpactedBuildingsTool", icon: BuildingFire },
        { name: "Landslide Prone Areas", key: "landslideProneAreas", icon: <MdLandscape size={34} /> },
        // { name: "Fire Risk ReductionTool", key: "fireRiskReductionTool", icon: FireRiskReductionTool },
        { name: "Disaster Management Network", key: "disasterNetwork", icon: <GiFlood size={20} /> },
        { name: "Disaster Impact Tool", key: "DisasterImpactTool", icon: disasterIcon },

      ],
    },

    {
      title: "BUID",
      name: "buid",
      icon: <FaBarcode size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "BUID",
      tools: [
        { name: "BUID Identification", key: "showbuid", icon: flooding },
        { name: "Flood Simulation", key: "floodsimulation", icon: Flooda },
        { name: "Flood Impact Analysis", key: "floodImpactAnalysis", icon: Floods },
        { name: "Property Validation Checker", key: "propertyValidationChecker", icon: PropertyValidationChecker },
        { name: "License Validation", key: "licenseValidation", icon: <GrValidate /> },
        { name: "SAC Classification", key: "sacClassificationWidget", icon: sac_clarification },
        { name: "Building Floor", key: "buildingFloorWidget", icon: floor },
        { name: "Population Density Encroachment", key: "populationdensityencroachment", icon: PopulationDensityEncroachement },
        { name: "Slum Encroachment", key: "slumEncroachment", icon: SlumEncroachement },
        { name: "3D Building Placement Tool", key: "building3DWidget", icon: BuildingPlacementIcon },
        { name: "Urban Planning", key: "urbanPlanning", icon: urbanplanningicon },
        { name: "Impact Analysis", key: "Impactalalysis", icon: Impact },
        { name: "Road Proximity", key: "roadProximityAnalysis", icon: "P" },
        { name: "Building Info Tool", key: "buildingInfoTool", icon: <FaRegBuilding size={20} /> },
      ],
    },

    {
      title: "Storm Water Drainage",
      name: "Storm",
      icon: <MdFlood size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Storm Water Drainage",
      tools: [
        { name: "Flood Simulation", key: "floodsimulation", icon: Flooda },
        { name: "Flood Impact Analysis", key: "floodImpactAnalysis", icon: Floods },
        { name: "Flooding Areas at Risk", key: "floodingSpots", icon: <MdOutlineFlood size={20} /> },
        { name: "SWD Slum Encroachment", key: "swdXSlum", icon: "S" },
        { name: "Storm Water Drainage Network", key: "swdNetwork", icon: <MdWater size={20} /> },
        { name: "River Retaining Wall", key: "riverRetainingWall", icon: <GiRiver size={27} /> },
        // { name: "Reservations", key: "reservations", icon: Reservartions },
      ],
    },
    {
      title: "Removal Of Encroachment",
      name: "ROE",
      icon: <MdRemoveCircleOutline size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "ROE",
      tools: [
        { name: "Population Heatmap", key: "populationHeatmapDensity", icon: Populationheatmap },
        { name: "Agriculture Encroachment", key: "agricultureEncroachment", icon: <GiWheat /> },
        { name: "Slum Encroachment", key: "slumEncroachment", icon: SlumEncroachement },
        { name: "Important Buildings", key: "importantBuildings", icon: <MdOutlineLocationCity /> }
      ],
    },
    {
      title: "Sewerage Operation",
      name: "Sewerage",
      icon: <MdWater size={22} />,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Sewerage Operation",
      tools: [
        { name: "Sewerage Network Points", key: "sewerageNetworkPoints", icon: <MdWater /> },
        { name: "Pumping Stations", key: "pumpingStations", icon: <BsBuildingsFill size={22} /> },
      ],
    }
  ];


  // Filter departments based on user role and department
  const getFilteredDepartments = () => {
    if (userRole === "super admin" || userRole == "admin") {
      return departments; // Show all departments for super admin
    }

    return departments.filter((dept) => {
      switch (userDepartment) {
        case "fire":
          return dept.name === "Fire";
        case "hydraulic":
          return dept.name === "Water";
        case "assessment":
          return dept.name === "Assessment";
        case "road":
          return dept.name === "Road";
        case "bridge":
          return dept.name === "Bridge";
        case "trees":
          return dept.name === "Tree";
        case "developement":
          return dept.name === "Building";
        case "environment":
          return dept.name === "Environment";
        case "license":
          return dept.name === "License";
        case "solid":
          return dept.name === "Solid Waste";
        case "disaster":
          return dept.name === "Disaster";
        case "buid":
          return dept.name === "buid";
        case "storm":
          return dept.name === "Storm";
        case "roe":
          return dept.name === "ROE";
        case "sewerage":
          return dept.name === "Sewerage";
        default:
          return false;
      }
    });
  };

  const filteredDepartments = getFilteredDepartments();
  // Find the full department object based on the selected name
  const selectedDepartment = filteredDepartments.find((dept) => dept.name.toLowerCase() === activeDepartment)

  // Handle department selection
  const handleDepartmentSelect = (dept) => {
    dispatch(setActiveDepartment(dept.name.toLowerCase()))
  }

  // Handle back to departments
  const handleBackToDepartments = () => {
    dispatch(setActiveDepartment(null))
    sceneView.graphics.removeAll()
  }

  const handleToolClick = (tool, department) => {
    dispatch(selectTool({ department: department.name.toLowerCase(), toolKey: tool.key }))
    console.log(`Selected Tool: ${tool.name} from Department: ${department.name}`)
    console.log(reduxDepartments)
    sceneView.graphics.removeAll()
  }

  return (
    <div className="relative">
      {/* Department Button */}


      {/* Enhanced Department Dropdown */}
      {isDepartmentOpen && isMapRoute && (
        <div
          className="absolute top-full right-15 mt-1 z-50"
          style={{
            animation: "bubbleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            transformOrigin: "top right",
          }}
        >
          <div>
            {/* Show department grid if no department is active */}
            {activeDepartment === null ? (
              // Department Grid View

              <div
                className={`bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6 ${filteredDepartments.length === 1
                  ? 'min-w-[140px] max-w-[160px]'
                  : filteredDepartments.length === 2
                    ? 'min-w-[280px] max-w-[320px]'
                    : filteredDepartments.length <= 6
                      ? 'min-w-[340px] max-w-[400px]'
                      : 'min-w-[440px] max-w-[480px]'
                  }`}
                style={{
                  filter:
                    "drop-shadow(0 25px 50px rgba(0, 0, 0, 0.25)) drop-shadow(0 0 0 1px rgba(255, 255, 255, 0.1))",
                  background: "linear-gradient(145deg, rgb(43 93 177 / 71%), rgba(255, 255, 255, 0.85))",
                  transform: "scale(1)",
                  opacity: 1,
                }}
              >
                {filteredDepartments.length === 0 && (
                  <h1 className="text-center text-boxdark text-lg font-semibold">No tools available for this department </h1>
                )}
                <div className={`grid gap-3 ${filteredDepartments.length === 1
                  ? 'grid-cols-1 justify-center'
                  : filteredDepartments.length === 2
                    ? 'grid-cols-2 justify-center'
                    : filteredDepartments.length <= 6
                      ? 'grid-cols-3'
                      : 'grid-cols-4'
                  }`}>
                  {filteredDepartments.map((dept, index) => (
                    <button
                      key={dept.name}
                      className={`group flex flex-col items-center space-y-2 p-2 rounded-xl transition-all duration-300 ${dept?.color} text-white transform hover:scale-105 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden`}
                      style={{
                        animation: `slideInBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${index * 0.08}s both`,
                        animationFillMode: "both",
                        minHeight: "85px",
                      }}
                      onClick={() => handleDepartmentSelect(dept)}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>

                      <div className="flex-shrink-0 relative z-10 transform group-hover:scale-110 transition-transform duration-300">
                        {renderIcon(dept.icon, 27)}
                      </div>
                      <div className="text-center relative z-10">
                        <span className="font-medium text-xs leading-tight block">{dept.title}</span>
                      </div>

                      {/* Ripple effect on hover */}
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute inset-0 rounded-xl bg-white/10 animate-ping"></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Department Tools View (only if a department is selected)
              selectedDepartment && (
                <div
                  className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20"
                  style={{
                    filter:
                      "drop-shadow(0 25px 50px rgba(0, 0, 0, 0.25)) drop-shadow(0 0 0 1px rgba(255, 255, 255, 0.1))",
                    background: "linear-gradient(145deg, rgb(43 93 177 / 71%), rgba(255, 255, 255, 0.85))",
                    transform: "scale(1)",
                    opacity: 1,
                  }}
                >
                  {/* Compact Horizontal Tools Toolbar */}
                  <div
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20 overflow-x-auto scrollbar-hide"
                    style={{
                      background: `linear-gradient(90deg, ${selectedDepartment?.color.includes("blue")
                        ? "rgba(59, 130, 246, 0.15)"
                        : selectedDepartment?.color.includes("red")
                          ? "rgba(239, 68, 68, 0.15)"
                          : selectedDepartment?.color.includes("green")
                            ? "rgba(34, 197, 94, 0.15)"
                            : selectedDepartment?.color.includes("gray")
                              ? "rgba(107, 114, 128, 0.15)"
                              : selectedDepartment?.color.includes("purple")
                                ? "rgba(147, 51, 234, 0.15)"
                                : selectedDepartment?.color.includes("yellow")
                                  ? "rgba(234, 179, 8, 0.15)"
                                  : selectedDepartment?.color.includes("orange")
                                    ? "rgba(249, 115, 22, 0.15)"
                                    : selectedDepartment?.color.includes("emerald")
                                      ? "rgba(16, 185, 129, 0.15)"
                                      : selectedDepartment?.color.includes("teal")
                                        ? "rgba(20, 184, 166, 0.15)"
                                        : "rgba(132, 204, 22, 0.15)"
                        }, rgba(255, 255, 255, 0.05))`,
                    }}
                  >
                    {/* Tool Icons */}

                    {selectedDepartment.tools.length > 0 ?
                      (selectedDepartment.tools.map((tool, index) => {
                        const toolKey = tool.key
                        const isToolActive =
                          reduxDepartments[activeDepartment]?.tools.find((t) => t.key === toolKey)?.isEnabled || false

                        return (
                          <button
                            key={tool.name}
                            className={`group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 transform hover:scale-110 hover:shadow-lg text-white flex-shrink-0 bg-[#1a73e8]  overflow-hidden ${isToolActive ? "ring-2 ring-yellow-400 bg-opacity-80" : ""
                              }`}
                            style={{
                              animation: `toolSlideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${index * 0.05}s both`,
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                              opacity: isToolActive ? 0.9 : 1,
                            }}
                            title={tool.name}
                            onClick={() => handleToolClick(tool, selectedDepartment)}
                          >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>

                            {/* Tool Icon */}
                            <span className="relative z-10 text-3xl transform group-hover:scale-110 transition-transform duration-200">
                              {renderIcon(tool.icon, 27)}
                            </span>

                            {/* Active indicator */}
                            {isToolActive && (
                              <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
                            )}

                            {/* Hover ripple */}
                            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="absolute inset-0 rounded-lg bg-white/20 animate-pulse"></div>
                            </div>
                          </button>
                        )
                      }))
                      : (
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-semibold">No Tools Available</span>
                        </div>
                      )}

                    {/* Separator */}
                    <div className="w-px h-6 bg-white/20 mx-1 flex-shrink-0"></div>

                    {/* Compact Back Button */}
                    <button
                      onClick={handleBackToDepartments}
                      className="group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 transform hover:scale-110 hover:shadow-lg text-white/80 hover:text-white bg-[#1a73e8] hover:bg-[#1a73e0] flex-shrink-0 overflow-hidden"
                      title="Back to Departments"
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>

                      {/* Back Icon */}
                      <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>

                      {/* Hover ripple */}
                      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="absolute inset-0 rounded-lg bg-white/10 animate-pulse"></div>
                      </div>
                    </button>
                  </div>
                </div>
              )
            )}



            {/* Floating particles effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${10 + i * 10}%`,
                    animation: `float 3s ease-in-out infinite ${i * 0.5}s`,
                    animationDirection: i % 2 === 0 ? "normal" : "reverse",
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {isDepartmentOpen && <div className="fixed inset-0 z-40" onClick={() => setIsDepartmentOpen(false)}></div>}

      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes bubbleIn {
          0% {
            transform: scale(0.1) translateY(-20px) rotate(-5deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.08) translateY(5px) rotate(2deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(1) translateY(0) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes slideInBounce {
          0% {
            transform: translateX(30px) translateY(10px) scale(0.8);
            opacity: 0;
          }
          60% {
            transform: translateX(-5px) translateY(-2px) scale(1.05);
            opacity: 0.8;
          }
          100% {
            transform: translateX(0) translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-10px) scale(1.2);
            opacity: 0.7;
          }
        }

        @keyframes toolSlideIn {
          0% {
            transform: translateY(20px) scale(0.8);
            opacity: 0;
          }
          60% {
            transform: translateY(-5px) scale(1.05);
            opacity: 0.8;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        /* Hide scrollbar for horizontal scroll */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Smooth horizontal scrolling */
        .scrollbar-hide {
          scroll-behavior: smooth;
        }

        /* Enhanced hover effects */
        .group:hover .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        /* Glass morphism effect */
        .backdrop-blur-lg {
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        /* Smooth transitions for all interactive elements */
        * {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  )
}

export default DepartmentTool