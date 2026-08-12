import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from "react-redux"
import { setActiveDepartment, selectTool, resetDepartment } from "../../store/features/department/departmentSlice.js"
import esriConfig from '@arcgis/core/config';
import esriRequest from '@arcgis/core/request';
import IdentityManager from '@arcgis/core/identity/IdentityManager';
import WebScene from '@arcgis/core/WebScene';
import SceneView from '@arcgis/core/views/SceneView';
import Legend from '@arcgis/core/widgets/Legend';
import Locate from '@arcgis/core/widgets/Locate';
import ScaleBar from '@arcgis/core/widgets/ScaleBar';
import '@arcgis/core/assets/esri/themes/light/main.css';
import axios from 'axios';
import { FaCampground, FaTree, FaFire, FaVideo } from 'react-icons/fa';
import { WiFlood } from 'react-icons/wi';
import { TbLocationSearch } from 'react-icons/tb';
import '../../css/Map.css';
import './TwoDMap.css';
import line3 from '../../images/logo/line3.svg';
import measurement from '../../images/logo/Measurment.svg';
import section from '../../images/logo/Section.svg';
import zoomToScale from '../../images/logo/toscale.svg';
import Attribute from '../../images/logo/Attribute.svg';
import Shadow from '../../images/logo/Shadow.svg';
import Proximity from '../../images/logo/Proximity.svg';
import ElevationProfileIcon from '../../images/logo/ElevationProfileIcon.svg';
import Advance from '../../images/logo/Advance.svg';
import Basic from '../../images/logo/Tool2Icon.svg';
import Zomm from '../../images/logo/ZoomIcon-01.svg';
import Impact from '../../images/logo/Zoommmm.svg';
import Building from '../../images/logo/Building.svg';
import Distance from '../../images/logo/Distance.svg';
import goto from '../../images/logo/Gotolocation.svg';
import get from '../../images/logo/Getlocation.svg';
import Dark from '../../images/logo/Darkspots.svg';
import Zoomout from '../../images/logo/Zoomout.svg';
import Area from '../../images/logo/Area.svg';
import Height from '../../images/logo/Height.svg';
import Renewable from '../../images/logo/Renewable.svg';
import PlaneIcon from '../../images/logo/PlaneIcon.svg';
import CropIcon from '../../images/logo/CropIcon.svg';
import Recent from '../../images/logo/Recent.svg';
import underground from '../../images/logo/Underground.svg';
import esriLogo from '../../images/logo/logo-esri.png';
import ToiletLogo from '../../images/logo/ToiletIcon-01.svg';
import { useMap } from '../../context/MapContext.jsx';
import ElevationProfileWidget from '../Tools/ElevationProfileWidget.jsx';
import GetCoordinatesWidget from '../Tools/latlong';
import ZoomOutFromSection from '../Tools/ZoomOutFromSection';
import GotoLocationTool from '../Tools/GotoLocationTool';
import GetLocationTool from '../Tools/GetLocationTool';
import ImpactAnalysisWidget from '../Tools/ImpactAnalysisTD.jsx';
import DarkSpotTool from '../Tools/DarkSpotTool';
import ViewshedAnalysis from '../Tools/ViewshedAnalysis';
import FireBufferWidget from '../Tools/FireBufferWidget';
import GreenCoverageTool from '../Tools/GreenCoverageTool';
import PlantationScopeTool from '../Tools/PlantationScopeTool';
import CreateProximityWidget from '../Tools/createProximityWidget';
import FloodAnalysis from '../Tools/FloodAnalysis';
import Building2024 from '../Tools/Building';
import RenewalWidget from '../Tools/RenewalWidget';
import UnderGround from '../Tools/UnderGround';
import CCTVDialog from '../Tools/CCTVDialog';
import HorizontalBuildingFinder from '../Tools/HorizontalBuildingFinder';
import MapSearchWidget from '../Tools/MapSearchWidget';
import RecentToolsPanel from '../Tools/Recent.jsx';
import CustomMapPopup from '../Tools/CustomPopup.jsx';
import BuildingUsageWidget from '../Tools/BuildingUsageWidget .jsx';
import BuildingConstructionWidget from '../Tools/BuildingConstructionWidget.jsx';
import BuildingAreaWidget from '../Tools/BuildingAreaWidget.jsx';
import BuildingFloorWidget from '../Tools/BuildingFloorWidget.jsx';
import CustomSwipeTool from '../Tools/CustomSwipeTool.jsx';
import GoogleStreetViewRedirect from '../Tools/GoogleStreetViewRedirect.jsx';
import ScreenshotTool from '../Tools/ScreenshotTool.jsx';
import BasemapGalleryComponent from '../Tools/BasemapGallery';
import BuildingPropertyTaxWidget from '../Tools/BuildingPropertyTaxWidget.jsx';
import DistanceMeasurementWidget from '../Tools/DistanceMeasurementWidget.jsx';
import AreaMeasurementWidget from '../Tools/AreaMeasurementWidget.jsx';
import HeightMeasurementWidget from '../Tools/HeightMeasurementWidget.jsx';
import GumastaPendingWidget from '../Tools/GumastaPendingWidget.jsx';
import RevenuePendingWidget from '../Tools/RevenuePendingWidget.jsx';
import ToiletDensityAnalysis from '../Tools/ToiletDensityAnalysis.jsx';
import LineOfSightWidget from '../Tools/LineOfSight.jsx';
import ShadowAnalysisWidget from '../Tools/ShadowAnalysisWidget.jsx';
import EmergencyBridge from '../Tools/EmergencyBridge.jsx';
import EmergencyHoardings from '../Tools/EmergencyHoardings.jsx';
import BuildingFloorDiffWidget from '../Tools/BuildingFloorDiffWidget.jsx';
import EmergencyBuilding from '../Tools/EmergencyBuilding.jsx';
import BridgeConnectedRoads from '../Tools/BridgeConnectedRoads.jsx';
import MapRotationComponent from '../Tools/MapRotationComponent.jsx';
import SliceAnalysisTool from '../Tools/SliceAnalysisTool.jsx';
import Building3DWidget from '../Tools/AssetPlacementWidget.jsx';
import BasemapOpacity from '../Tools/BasemapOpacity.jsx';
import Selection from '../Tools/Selection.jsx';
import SACClassificationWidget from '../Tools/SACClassificationWidget.jsx';
import LicensesDepartment from '../Tools/LicenseValidation.jsx';
import SilentZoneAnalysis from '../Tools/SilentZoneAnalysis.jsx';
import ManholeDetection from '../Tools/ManholeDetection.jsx';
import DumpingGrounds from '../Tools/DumpingGrounds.jsx';
import GarbageCollection from '../Tools/GarbageCollection.jsx';
import SWDVehicles from '../Tools/SWDVehicles.jsx';
import RoadConstructionMaterial from '../Tools/RoadConstructionMaterial.jsx';
import SpatialAnalysis from '../Tools/SpatialAnalysis.jsx';
import FloodingSpots from '../Tools/FloodingSpots.jsx';
import BuildingLicenseChecker from '../Tools/BuildingLicenseChecker.jsx';
import TreePointAnalysis from '../Tools/TreePointAnalysis.jsx';
import SearchLocationTool from '../Tools/SearchLocationTool.jsx';
import LayerListWidget from '../Tools/LayerListWidget.jsx';
import ZoomToSection from '../Tools/ZoomToSection';
import ZoomToScale from '../Tools/ZoomToScale';
import AttributeSearch from '../Tools/AttributeSearch';
import FireIncedentMapping from '../Tools/FireIncedentMapping';
import PanoramaViewer from '../Tools/PanoramaViewer.jsx';
import FloodSimulation from '../Tools/FloodSimulation.jsx';
import find from '../../images/logo/Selection_Tool.svg';
import OysterMap from '../Tools/OysterMap.jsx';

const TwoDMap = ({ isHeaderCollapsed }) => {

  // redux state and actions
  const dispatch = useDispatch()
  const { departments: reduxDepartments, activeDepartment } = useSelector((state) => state.departmentTool)
  const {
    registerQuickAccessButtonFunction,
    registerQuickAccessButtonState
  } = useMap();
  const { isExpanded, setIsExpanded } = useMap();
  const { showQuickAccess, setWebscene, setSceneView } = useMap();
  const { isToiletEnabled, setToiletEnabled } = useMap();
  const { showImpactOptionsTD, setImpactEnabled } = useMap();
  const { showBasemapGallery, setShowBasemapGallery } = useMap();
  const mapContainer3DRef = useRef(null);
  const panoramaRef = useRef(null);
  const isNavigatingRef = useRef(false);
  const [view, setView] = useState(null);
  const [map, setMap] = useState(null)
  const [lineOfSightWidget, setLineOfSightWidget] = useState(null);
  const [isPanoramaEnabled, setIsPanoramaEnabled] = useState(false)
  const [panoramaType, setPanoramaType] = useState(null) // 
  const [layers, setLayers] = useState([]);
  const [isLayerListVisible, setIsLayerListVisible] = useState(false);
  const [isPopupEnabled, setIsPopupEnabled] = useState(false);
  const [googleStreet, setGoogleStreet] = useState(false)
  const [showOptions, setShowOptions] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);
  const [isZoomToSectionEnabled, setIsZoomToSectionEnabled] = useState(false);
  const [isZoomOutFromSectionEnabled, setIsZoomOutFromSectionEnabled] =
    useState(false);
  const [isZoomToScaleEnabled, setIsZoomToScaleEnabled] = useState(false);
  const [showLocationTools, setShowLocationTools] = useState(false);
  const [showVisibilityTools, setShowVisibilityTools] = useState(false);
  const [isGotoLocationEnabled, setIsGotoLocationEnabled] = useState(false);
  const [isGetLocationToolEnabled, setIsGetLocationToolEnabled] =
    useState(false);
  const [isViewShedEnabled, setIsViewShedEnabled] = useState(false);
  const [isAttributeSearchEnabled, setIsAttributeSearchEnabled] =
    useState(false);
  const [isProximityWidgetEnabled, setIsProximityWidgetEnabled] =
    useState(false);
  const [showHorizontal, setShowHorizontal] = useState(false);
  const [isTopView, setTopView] = useState(false);
  const [isMapSearchEnabled, setIsMapSearchEnabled] = useState(false);
  const [isLegendsToolVisible, setIsLegendsToolVisible] = useState(false);
  const [legendWidget, setLegendWidget] = useState(null);
  const [recentTools, setRecentTools] = useState([]);
  const [showRecentTools, setShowRecentTools] = useState(false);
  const [showBuilding2024, setShowBuilding2024] = useState(false);
  const [isCustomSwipeEnabled, setIsCustomSwipeEnabled] = useState(false);
  const [isScreenshotVisiable, setIsScreenshotVisiable] = useState(false);
  const [isHeightMeasurementWidgetVisible, setIsHeightMeasurementWidgetVisible] = useState(false)
  const [isAreaMeasurementWidgetVisible, setIsAreaMeasurementWidgetVisible] = useState(false)
  const [isDistanceMeasurementWidgetVisible, setIsDistanceMeasurementWidgetVisible] = useState(false)
  const [isRealityModelEnabled, setIsRealityModelEnabled] = useState(false);
  const [lineOfSightWidgetEnabled, setLineOfSightWidgetEnabled] = useState(false);
  const [shadowAnalysisEnabled, setShadowAnalysisEnabled] = useState(false);
  const [isLoDModelEnabled, setIsLoDModelEnabled] = useState(false)
  const [emergencyBuildingEnabled, setEmergencyBuildingEnabled] = useState(false)
  const [isMapRotationToolEnabled, setIsMapRotationToolEnabled] = useState(false);
  const [isSliceAnalysisEnabled, setIsSliceAnalysisEnabled] = useState(false)
  const [isElevationProfileVisible, setIsElevationProfileVisible] = useState(false)
  const [isBasemapOpacityEnabled, setIsBasemapOpacityEnabled] = useState(false)
  const [isSelectionEnabled, setIsSelectionEnabled] = useState(false);
  const [showOysterMap, setShowOysterMap] = useState(false);

  const MapButton = ({
    onClick,
    title,
    icon,
    isActive = false,
    variant = 'default',
    className = '',
    style = {},
    iconScale = 1.5,
    onGroupHoverChange, // 🆕 Hover toggle callback
  }) => {
    // Get the background color based on the active state and variant
    const getBackground = () => {
      if (variant === 'category') {
        return 'linear-gradient(145deg,#93c5fd, rgb(10, 5, 2))';
      }
      if (variant === 'top-toolbar') {
        return isActive ? 'rgb(169 188 7)' : '#005ab0'; // Use the different blue for top toolbar
      }
      return isActive ? 'rgb(169 188 7)' : '#1a83fc';
    };

    // Base styles that apply to all button variants
    const baseStyles = {
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition:
        'transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      border:
        variant === 'toolbar' || variant === 'top-toolbar'
          ? '1px solid white'
          : 'none',
      background: getBackground(),
      width: variant === 'category' ? '30px' : '33px',
      height: variant === 'category' ? '30px' : '33px',
    };

    // Variant styles
    const variantStyles = {
      default: {
        borderRadius: '20px',
        padding: '8px 12px',
      },
      circle: {
        borderRadius: '50%',
      },
      toolbar: {
        borderRadius: '20px',
        padding: '8px 12px',
        border: '1px solid white',
      },
      'top-toolbar': {
        borderRadius: '20px',
        padding: '8px 12px',
        border: '1px solid white',
      },
      menu: {
        borderRadius: '10%',
        border: '1px solid white',
        boxShadow: '0 4px 12px rgba(230, 144, 15, 0.5)',
      },
      category: {
        borderRadius: '50%',
      },
    };

    // Combine all styles
    const combinedStyles = {
      ...baseStyles,
      ...variantStyles[variant],
      ...style, // Custom styles can override defaults
    };

    // Event handlers for hover effects
    const handleMouseEnter = (e) => {
      e.currentTarget.style.transform =
        variant === 'top-toolbar' ? 'scale(1)' : 'scale(1.5)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
      e.currentTarget.style.background =
        'linear-gradient(145deg, orange, orangered)';
    };

    const handleMouseLeave = (e) => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';

      // Different background for top toolbar buttons
      if (variant === 'top-toolbar') {
        e.currentTarget.style.background = isActive
          ? 'rgb(169 188 7)'
          : '#005ab0';
      } else {
        e.currentTarget.style.background = getBackground();
      }
    };

    // Render the button content
    const renderContent = () => {
      // Handle string text content (like "☰", "V", "I")
      if (typeof icon === 'string' && icon.length <= 2) {
        return icon; // Render text directly
      }

      // Handle component icons (like React icons)
      if (typeof icon !== 'string') {
        return icon;
      }

      // Handle image paths
      return (
        <img
          src={icon || '/placeholder.svg'}
          alt={title}
          style={{
            width: '20px',
            height: '20px',
            objectFit: 'contain',
            transform: `scale(${iconScale})`,
          }}
        />
      );
    };

    return (
      <button
        onClick={onClick}
        style={combinedStyles}
        title={title}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderContent()}
      </button>
    );
  };

  // Reset all states function
  const resetAllStates = (except) => {
    console.log(except);

    view.graphics.removeAll();


    if (except !== 'legends') {
      setIsLegendsToolVisible(false);
      document.getElementById('legends-tool-container')?.remove();
    }


    if (except !== 'zoom in' && except !== 'zoom out' && except !== 'zoom to') {
    }
    setShowZoom(false);

    if (
      except !== 'line of sight' &&
      except !== 'shadow analysis' &&
      except !== 'view shed'
    ) {
    }
    setShowVisibilityTools(false);


    if (except !== 'goto' && except !== 'get location' && except !== 'search') {
    }


    // setIsToiletEnabled(false);
    setIsPanoramaEnabled(false);
    setPanoramaType(null)
    setToiletEnabled(false);
    setIsDistanceMeasurementWidgetVisible(false)
    setIsAreaMeasurementWidgetVisible(false)
    setIsHeightMeasurementWidgetVisible(false)
    setShowLocationTools(false);
    setEmergencyBuildingEnabled(false)
    setIsProximityWidgetEnabled(false);
    setIsGetLocationToolEnabled(false);
    setIsAttributeSearchEnabled(false);
    setIsZoomToScaleEnabled(false);
    setIsZoomOutFromSectionEnabled(false);
    setIsGotoLocationEnabled(false);
    setIsSelectionEnabled(false)
    // setIsPopupEnabled(false)
    setIsZoomToSectionEnabled(false);
    setShowBuilding2024(false);
    setLineOfSightWidgetEnabled(false);
    setShadowAnalysisEnabled(false);
    // console.log(except)
    // Add other state resets here as needed
    setShowHorizontal(false);
    setIsViewShedEnabled(false);
    setImpactEnabled(false);
    setIsMapSearchEnabled(false);
    setIsElevationProfileVisible(false)
    setIsSliceAnalysisEnabled(false)
    setIsMapRotationToolEnabled(false);

    if (except !== "usage" && except !== "construction" && except !== "building_area" && except !== "floor") {
    }

    setShowOptions(false);
    // Only close the options dropdown if we're not toggling between measurement tools
    if (except !== 'height' && except !== 'distance' && except !== 'area') {
    }


    if (lineOfSightWidget) {
      view.ui.remove(lineOfSightWidget.container.parentNode);
      lineOfSightWidget.destroy();
      setLineOfSightWidget(null);
      view.graphics.removeAll();
    }
  };

  // Add this handler function
  const handleGoogleStreetRedirect = () => {
    setGoogleStreet(false); // Disable the button after redirect
  };

  // Toggle category function
  const toggleCategory = (category) => {
    setOpenCategory((prev) => (prev === category ? null : category));
  };

  // Initialize the map
  useEffect(() => {
    // Configure the ArcGIS API
    esriConfig.portalUrl = 'https://bmc3dmumbai.com/portal';

    const initializeMap = async () => {
      if (!mapContainer3DRef.current) {
        console.error('Map container reference is not set.');
        return;
      }

      const webscene = new WebScene({
        portalItem: { id: '5b90ae88635348e1ad2c1b343650eba8' },
      });

      // Create a SceneView
      const sceneView = new SceneView({
        container: mapContainer3DRef.current,
        map: webscene,
        camera: {
          position: [72.8777, 19.0760, 800],
          tilt: 60,
        },
        environment: {
          atmosphereEnabled: true,
          starsEnabled: true,
          background: null,
          lighting: {
            type: "sun",
          },
          weather: {
            type: "cloudy",
            cloudCover: 0.1,
          },
        },
        qualityProfile: 'medium',
      });

      // Correct zoom using goTo
      sceneView.when(() => {
        sceneView.goTo({
          center: [72.847187, 18.999758],
          zoom: 13,
          tilt: 65
        });
      });

      // Wait for the webscene to load
      await webscene.when();

      // Disable popups by default
      sceneView.popupEnabled = false;

      // Add scale bar
      const scaleBar = new ScaleBar({
        view: sceneView,
        unit: 'metric',
        style: 'ruler',
      });
      sceneView.ui.add(scaleBar, 'bottom-right');

      setMap(webscene)
      setView(sceneView);
      setWebscene(webscene);
      setSceneView(sceneView);

      // Add locate widget when view is ready
      sceneView.when(() => {
        const locateWidget = sceneView.ui.find('locate-widget');
        if (!locateWidget) {
          const locate = new Locate({
            view: sceneView,
            useHeadingEnabled: false,
            goToOverride: (view, goToParams) => {
              goToParams.target.zoom = 15;
              return view.goTo(goToParams.target);
            },
          });
          sceneView.ui.add(locate, 'top-left');
        }

      });
    };

    // Login silently to portal
    async function loginSilentlyToPortal({ username, password, portalUrl }) {
      const tokenServiceUrl = `${portalUrl}/sharing/rest/generateToken`;

      const response = await esriRequest(tokenServiceUrl, {
        method: 'post',
        query: {
          username,
          password,
          referer: window.location.origin,
          f: 'json',
        },
      });

      if (!response?.data?.token) {
        throw new Error('No token returned from the server');
      }

      IdentityManager.registerToken({
        server: `${portalUrl}/sharing/rest`,
        token: response.data.token,
        userId: username,
        expires: Date.now() + 60 * 60 * 1000,
      });

      console.log(
        'Token generated and registered successfully. No popup needed.',
      );
    }

    loginSilentlyToPortal({
      username: 'gisuserone',
      password: 'Saar#@!1206',
      portalUrl: 'https://bmc3dmumbai.com/portal',
    })
      .then(() => {
        initializeMap();
      })
      .catch((err) => {
        console.log('Silent login error:', err);
        initializeMap(); // Try to initialize map anyway
      });

    return () => {
      if (view) view.destroy();
    };
  }, []);


  // Toggle layer list
  const toggleLayerList = () => {
    setIsLayerListVisible(prev => !prev)
  };

  const toggleLegendsTool = () => {
    setIsLegendsToolVisible((prev) => {
      const newVisibility = !prev;

      if (!newVisibility) {
        document.getElementById('legends-tool-container')?.remove();
        if (legendWidget) {
          legendWidget.destroy();
          setLegendWidget(null);
        }
      } else {
        if (view && !document.getElementById('legends-tool-container')) {
          const container = document.createElement('div');
          container.id = 'legends-tool-container';
          container.style.width = '310px';
          container.style.height = 'auto';
          container.style.maxHeight = '450px';
          container.style.background = 'white';
          container.style.borderRadius = '8px';
          container.style.overflow = 'hidden';
          container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
          container.style.position = 'absolute';
          container.style.top = '3px';
          container.style.right = '56px';
          container.style.zIndex = '999';
          container.style.display = 'flex';
          container.style.flexDirection = 'column';

          // Create header section
          const headerSection = document.createElement('div');
          headerSection.style.display = 'flex';
          headerSection.style.alignItems = 'center';
          headerSection.style.justifyContent = 'space-between';
          headerSection.style.background = '#1a73e8';
          headerSection.style.padding = '8px 12px';
          headerSection.style.cursor = 'move';
          headerSection.style.borderBottom = '1px solid #eaeaea';
          headerSection.style.color = 'white';

          let isBodyVisible = true;

          const collapseButton = document.createElement('button');
          collapseButton.textContent = '▲';
          collapseButton.style.background = 'none';
          collapseButton.style.border = 'none';
          collapseButton.style.color = 'white';
          collapseButton.style.cursor = 'pointer';

          const contentSection = document.createElement('div');
          contentSection.style.padding = '15px';
          contentSection.style.overflowY = 'auto';
          contentSection.style.maxHeight = '300px';

          collapseButton.addEventListener('click', () => {
            isBodyVisible = !isBodyVisible;
            collapseButton.textContent = isBodyVisible ? '▲' : '▼';
            contentSection.style.display = isBodyVisible ? 'block' : 'none';
          });

          const title = document.createElement('div');
          title.textContent = 'Layer Legends';
          title.style.fontSize = '16px';
          title.style.color = 'white';

          const closeButton = document.createElement('button');
          closeButton.textContent = '✖';
          closeButton.setAttribute('data-role', 'close-button');
          closeButton.style.background = 'none';
          closeButton.style.border = 'none';
          closeButton.style.color = 'white';
          closeButton.style.cursor = 'pointer';
          closeButton.addEventListener('click', () => {
            toggleLegendsTool();
            setIsLegendsToolVisible(false);
          });

          headerSection.appendChild(collapseButton);
          headerSection.appendChild(title);
          headerSection.appendChild(closeButton);
          container.appendChild(headerSection);
          container.appendChild(contentSection);

          // Create ArcGIS Legend widget with necessary configuration
          const legend = new Legend({
            view: view,
            container: contentSection,
            layout: 'stack', // Stack the layers vertically
          });

          // Store reference to the legend widget
          setLegendWidget(legend);

          // Function to update heading and layer visibility dynamically
          const updateLegendHeading = () => {
            // Wait for the legend heading and update styles
            const legendHeading = document.querySelector('.esri-widget__heading');
            if (legendHeading) {
              legendHeading.style.color = 'black'; // Set the heading color to black
              legendHeading.style.display = 'block'; // Make sure the heading is visible
            }
          };

          // Trigger the updateLegendHeading function once the legend is loaded
          legend.when(() => {
            updateLegendHeading(); // Apply color and visibility to the heading
          });

          // Watch handles to keep the legend updated with visibility changes
          const watchHandles = [];

          const setupWatchHandles = () => {
            watchHandles.forEach((handle) => handle.remove());
            watchHandles.length = 0;

            view.map.allLayers.forEach((layer) => {
              const handle = layer.watch('visible', () => {
                if (legend) {
                  legend.style = legend.style; // Force refresh of the legend
                }
              });
              watchHandles.push(handle);
            });
          };

          setupWatchHandles();

          const layersWatchHandle = view.map.allLayers.on('change', setupWatchHandles);
          watchHandles.push(layersWatchHandle);

          // Make the container draggable
          makeDraggable(container, headerSection);
          view.ui.add(container);

          // Clean up function when the component is closed
          closeButton.onclick = () => {
            watchHandles.forEach((handle) => handle.remove());
            view.ui.remove(container);
            document.getElementById('legends-tool-container')?.remove();
            if (legend) {
              legend.destroy();
              setLegendWidget(null);
            }
            setIsLegendsToolVisible(false);
          };
        }
      }

      return newVisibility;
    });
  };



  function makeDraggable(element, dragHandle) {
    if (!element || !dragHandle) return;

    // Drag logic with boundary constraints
    const onDragStart = (e) => {
      e.preventDefault();
      if (e.target.dataset.role === 'close-button') return;

      const container = element;
      if (!container) return;

      const parent = container.offsetParent;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const rect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const onMouseMove = (moveEvent) => {
        const newLeft = moveEvent.clientX - parentRect.left - offsetX;
        const newTop = moveEvent.clientY - parentRect.top - offsetY;

        // Apply boundary constraints
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const parentWidth = parent.offsetWidth;
        const parentHeight = parent.offsetHeight;

        const maxLeft = parentWidth - containerWidth;
        const maxTop = parentHeight - containerHeight;

        // Ensure the widget stays within bounds
        const boundedLeft = Math.max(0, Math.min(newLeft, maxLeft));
        const boundedTop = Math.max(0, Math.min(newTop, maxTop));

        container.style.top = boundedTop + 'px';
        container.style.left = boundedLeft + 'px';
        container.style.right = ''; // override right
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    dragHandle.addEventListener('mousedown', onDragStart);

    // Add resize observer to handle parent resizing
    const resizeObserver = new ResizeObserver(() => {
      if (!element || !element.offsetParent) return;

      const container = element;
      const parent = container.offsetParent;

      const currentLeft = parseFloat(container.style.left) || 0;
      const currentTop = parseFloat(container.style.top) || 0;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const parentWidth = parent.offsetWidth;
      const parentHeight = parent.offsetHeight;

      const maxLeft = parentWidth - containerWidth;
      const maxTop = parentHeight - containerHeight;

      // If the widget is outside bounds after resize, adjust position
      if (currentLeft > maxLeft || currentTop > maxTop) {
        container.style.left = Math.min(currentLeft, maxLeft) + 'px';
        container.style.top = Math.min(currentTop, maxTop) + 'px';
      }
    });

    // Start observing the parent element
    if (element.offsetParent) {
      resizeObserver.observe(element.offsetParent);
    }

    // Store resizeObserver on the element to clean it up later
    element._resizeObserver = resizeObserver;
  }




  const toggleTopView = () => {
    // const Center = [72.849098, 19.00737]
    view
      .goTo({
        // center: Center,
        tilt: 0,
        // zoom: 18,
      })
      .then(() => {
        console.log('Zoom.');
        setTopView(true);
      })
      .catch((error) => {
        console.error('Error on 3D:', error);
        setTopView(false);
      });
  };

  // Toggle popup
  const togglePopup = () => {
    setIsPopupEnabled(!isPopupEnabled)
    // Note: We no longer need to set view.popupEnabled since we're using our custom popup
    if (view) view.popupEnabled = false // Always disable the default popup
  }


  const toggleRealityModel = () => {
    if (!view || !view.map) return;

    // Find the 3D Mesh layer
    const meshLayer = view.map.layers.find(layer => layer.title && layer.title === '3D Mesh');
    const meshLayer2 = view.map.layers.find(layer => layer.title && layer.title === 'Reality Model - BMC Segment - 01');
    const meshLayer3 = view.map.layers.find(layer => layer.title && layer.title === 'Reality Model - BMC Segment - 02');

    // Toggle the visibility of each found layer without breaking if others are missing
    let isUpdated = false;

    if (meshLayer) {
      meshLayer.visible = !meshLayer.visible;
      isUpdated = true; // At least one layer was toggled
    }

    if (meshLayer2) {
      meshLayer2.visible = !meshLayer2.visible;
      isUpdated = true; // At least one layer was toggled
    }

    if (meshLayer3) {
      meshLayer3.visible = !meshLayer3.visible;
      isUpdated = true; // At least one layer was toggled
    }

    // If any layer was found and toggled, update the state
    if (isUpdated) {
      // Check if any of the layers are visible
      const anyLayerVisible = [meshLayer, meshLayer2, meshLayer3].some(layer => layer && layer.visible);
      setIsRealityModelEnabled(anyLayerVisible);
    } else {
      console.log('No layers found to toggle');
    }
  };


  const toggleLoDModel = () => {
    if (!view || !view.map) return;

    // Find all three LoD layers
    const lodLayer1 = view.map.layers.find(layer =>
      layer.title && layer.title === 'LOD - 01 - BMC Segment 01 Without Texture'
    );
    const lodLayer2 = view.map.layers.find(layer =>
      layer.title && layer.title === 'LOD - 02 - BMC Segment 03 Without Texture'
    );
    const lodLayer3 = view.map.layers.find(layer =>
      layer.title && layer.title === 'LOD - 02 - BMC Segment 04 Without Texture'
    );

    let isUpdated = false;

    if (lodLayer1) {
      lodLayer1.visible = !lodLayer1.visible;
      isUpdated = true;
    }

    if (lodLayer2) {
      lodLayer2.visible = !lodLayer2.visible;
      isUpdated = true;
    }

    if (lodLayer3) {
      lodLayer3.visible = !lodLayer3.visible;
      isUpdated = true;
    }

    if (isUpdated) {
      const anyLayerVisible = [lodLayer1, lodLayer2, lodLayer3].some(
        layer => layer && layer.visible
      );
      setIsLoDModelEnabled(anyLayerVisible);
    } else {
      console.log('No LoD layers found to toggle');
    }
  };


  useEffect(() => {
    if (!view) return;
    const updateLayers = () => {
      const allLayers = [];
      if (view) {
        view.map.layers.forEach((layer) => allLayers.push(layer));
      }
      setLayers(allLayers);
    };

    let view3DHandle, view2DHandle;

    if (view) {
      view3DHandle = view.map.layers.on('change', updateLayers);
    }

    updateLayers(); // Initial population of layers
    view.when(() => {
      const meshLayer = view.map?.layers.find(
        (layer) => layer.title && layer.title === '3D Mesh'
      );

      if (meshLayer) {
        setIsRealityModelEnabled(meshLayer.visible);
      }
    });
    return () => {
      if (view3DHandle) view3DHandle.remove(); // Properly remove the handler
    };
  }, [view]);


  // Zoom to extent
  const zoomToExtent = () => {
    resetAllStates();
    if (!view) return;

    // Coordinates for Worli's center
    const Center = [72.847187, 18.999758]; // Longitude, Latitude

    view
      .goTo({
        center: Center,
        zoom: 13,
      })
      .then(() => {
        console.log('Zoom to Worli successful on 3D map.');
      })
      .catch((error) => {
        console.error('Error zooming to Worli on 3D:', error);
      });
  };

  // Separator style for menu
  const separatorStyle = {
    borderTop: '1px solid white',
    margin: '3px 0',
    width: '100%',
  };

  // Function to handle tool clicks and update recent tools
  const handleRecentToolClick = (tool) => {
    console.log('tool', tool);

    // First reset all states to ensure clean activation
    resetAllStates();

    // Then activate the specific tool
    switch (tool.name) {
      case 'Measurement':
        toggleCategory('basic');
        setShowOptions(true);
        updateRecentTools('Measurement');
        break;
      case 'Zoom':
        toggleCategory('basic');
        setShowZoom(true);
        updateRecentTools('Zoom');
        break;
      case 'Go to Location':
        setIsGotoLocationEnabled(true);
        updateRecentTools('Go to Location');
        break;
      case 'Search Location':
        setIsMapSearchEnabled(true);
        updateRecentTools('Search Location');
        break;
      case 'Location':
        setShowLocationTools(!showLocationTools);
        updateRecentTools('Location');
        break;
      case 'Get Location':
        setIsGetLocationToolEnabled(true);
        updateRecentTools('Get Location');
        break;
      case 'Zoom to Scale':
        setIsZoomToScaleEnabled(true);
        updateRecentTools('Zoom to Scale');
        break;
      case 'Change Detection':
        setShowHorizontal(true);
        updateRecentTools('Change Detection');
        break;
      case 'Green Coverage Area':
        setIsGreenCoverageToolOpen(true);
        updateRecentTools('Green Coverage Area');
        break;
      case 'Plantation Scope Area':
        setIsPlantationScopeToolOpen(true);
        updateRecentTools('Plantation Scope Area');
        break;
      case 'Attribute Search':
        setIsAttributeSearchEnabled(true);
        updateRecentTools('Attribute Search');
        break;
      case 'Buffer Analysis':
        setIsProximityWidgetEnabled(true);
        updateRecentTools('Buffer Analysis');
        break;
      case 'Fire Widget':
        setIsFireWidgetOpen(true);
        updateRecentTools('Fire Widget');
        break;
      case 'Utility Analysis':
        setShowUnderGround(true);
        updateRecentTools('Utility Analysis');
        break;
      case 'Line of Sight':
        setLineOfSightWidgetEnabled(true)
        // toggleLineOfSight();
        updateRecentTools('Line of Sight');
        break;
      case 'Shadow Analysis':
        setShadowAnalysisEnabled(true);
        updateRecentTools('Shadow Analysis');
        break;
      case 'View Shed':
        setIsViewShedEnabled(true);
        updateRecentTools('View Shed');
        break;
      case 'Impact Analysis':
        setImpactEnabled(true);
        updateRecentTools('Impact Analysis');
        break;
      case 'CCTV Viewer':
        setIsCCTVDialogEnabled(true);
        updateRecentTools('CCTV Viewer');
        break;
      case 'Flood Analysis':
        setShowFloodAnalysis(true);
        updateRecentTools('Flood Analysis');
        break;
      case 'Dark Spot':
        setIsDarkSpotToolEnabled(true);
        updateRecentTools('Dark Spot');
        break;
      case 'Renewal Energy':
        setShowRenewal(true);
        updateRecentTools('Renewal Energy');
        break;
      case 'Distance':
        setShowOptions(true);
        updateRecentTools('Distance');
        break;
      case 'Height':
        setShowOptions(true);
        updateRecentTools('Height');
        break;
      case 'Green Analysis':
        setShowOptions(true);
        updateRecentTools('Green Analysis');
        break;
      case 'Visibility tools':
        setShowOptions(true);
        updateRecentTools('Visibility tools');
        break;
      case 'Area':
        setShowOptions(true);
        updateRecentTools('Area');
        break;
      default:
        console.log(`Unknown tool clicked: ${tool.name}`);
    }

    // Close the recent tools panel
    setShowRecentTools(false);
  };

  // Update the updateRecentTools function to include the icon
  const updateRecentTools = (toolName) => {
    setRecentTools((prevTools) => {
      let toolIcon = null;

      // Map tool names to their icons
      switch (toolName) {
        case 'Measurement':
          toolIcon = measurement;
          break;
        case 'Zoom':
          toolIcon = Zomm;
          break;
        case 'Go to Location':
          toolIcon = goto;
          break;
        case 'Search Location':
          toolIcon = <TbLocationSearch size={20} />;
          break;
        case 'Get Location':
          toolIcon = get;
          break;
        case 'Location':
          toolIcon = get;
          break;
        case 'Zoom to Scale':
          toolIcon = zoomToScale;
          break;
        case 'Change Detection':
          toolIcon = Building;
          break;
        case 'Green Coverage Area':
          toolIcon = <FaTree size={14} />;
          break;
        case 'Plantation Scope Area':
          toolIcon = <FaCampground size={14} />;
          break;
        case 'Attribute Search':
          toolIcon = Attribute;
          break;
        case 'Buffer Analysis':
          toolIcon = Proximity;
          break;
        case 'Fire Widget':
          toolIcon = <FaFire size={14} />;
          break;
        case 'Utility Analysis':
          toolIcon = underground;
          break;
        case 'Line of Sight':
          toolIcon = line3;
          break;
        case 'Shadow Analysis':
          toolIcon = Shadow;
          break;
        case 'View Shed':
          toolIcon = 'V';
          break;
        case 'Impact Analysis':
          toolIcon = Impact;
          break;
        case 'CCTV Viewer':
          toolIcon = <FaVideo size={14} />;
          break;
        case 'Flood Analysis':
          toolIcon = <WiFlood style={{ width: '20px', height: '20px' }} />;
          break;
        case 'Dark Spot':
          toolIcon = Dark;
          break;
        case 'Renewal Energy':
          toolIcon = Renewable;
          break;
        case 'Distance':
          toolIcon = Distance;
          break;
        case 'Height':
          toolIcon = Height;
          break;
        case 'Green Analysis':
          toolIcon = <FaTree size={14} />;
          break;
        case 'Visibility tools':
          toolIcon = line3;
          break;
        case 'Area':
          toolIcon = Area;
          break;
        case 'Sanitary':
          toolIcon = ToiletLogo;
          break;
        default:
          toolIcon = 'T';
      }


      const newTool = {
        name: toolName,
        icon: toolIcon,
        lastUsed: new Date(), // Use lastUsed as the property name
        timestamp: new Date(), // Also include timestamp for compatibility
      };

      // Check if the tool already exists in the recent tools
      const existingToolIndex = prevTools.findIndex((t) => t.name === toolName);

      if (existingToolIndex !== -1) {
        // If the tool exists, move it to the beginning and update the timestamp
        const updatedTools = [...prevTools];
        updatedTools.splice(existingToolIndex, 1);
        updatedTools.unshift(newTool);
        return updatedTools;
      } else {
        // If the tool doesn't exist, add it to the beginning
        const updatedTools = [newTool, ...prevTools];

        // Limit the number of recent tools to 10
        return updatedTools.slice(0, 10);
      }
    });
  };


  // A) Register functions once (or when their identity changes)
  useEffect(() => {
    registerQuickAccessButtonFunction('bentleypanorama', () => {
      // If Bentley panorama is currently active, turn it off
      if (isPanoramaEnabled && panoramaType === 'bentley') {
        setIsPanoramaEnabled(false);
        setPanoramaType(null);
        return;
      }

      // Reset other states if needed
      resetAllStates();

      // Enable Bentley panorama
      setIsPanoramaEnabled(true);
      setPanoramaType('bentley');
    });

    registerQuickAccessButtonFunction('streetviewpanorama', () => {
      // If Street View panorama is currently active, turn it off
      if (isPanoramaEnabled && panoramaType === 'closest') {
        setIsPanoramaEnabled(false);
        setPanoramaType(null);
        return;
      }

      // Reset other states if needed
      resetAllStates();

      // Enable Street View panorama
      setIsPanoramaEnabled(true);
      setPanoramaType('closest');
    });
    registerQuickAccessButtonFunction('screenshot', () => {
      setIsScreenshotVisiable(prev => !prev);
    });
    registerQuickAccessButtonFunction('identify', () => {
      setIsPopupEnabled(prev => !prev);
      togglePopup();
    });
    registerQuickAccessButtonFunction('layers', toggleLayerList);
    registerQuickAccessButtonFunction('legends', toggleLegendsTool);
    registerQuickAccessButtonFunction('lodModel', toggleLoDModel);
    registerQuickAccessButtonFunction('realityModel', toggleRealityModel);
    registerQuickAccessButtonFunction('zoomExtent', zoomToExtent);
    registerQuickAccessButtonFunction('clearAll', resetAllStates);
    registerQuickAccessButtonFunction('topView', toggleTopView);
    registerQuickAccessButtonFunction('googleStreet', () => setGoogleStreet(prev => !prev));
  }, [
    // ensure THESE are stable via useCallback/refs in TwoDMap:
    resetAllStates,
    setIsPanoramaEnabled,
    panoramaType,
    resetAllStates,
    setIsScreenshotVisiable,
    setIsPopupEnabled,
    togglePopup,
    toggleLayerList,
    toggleLegendsTool,
    toggleLoDModel,
    toggleRealityModel,
    zoomToExtent,
    toggleTopView,
    setGoogleStreet,
    registerQuickAccessButtonFunction
  ]);

  // B) Register states when they change (no function deps here)
  useEffect(() => {
    registerQuickAccessButtonState('bentleypanorama', isPanoramaEnabled && panoramaType === 'bentley');
    registerQuickAccessButtonState('streetviewpanorama', isPanoramaEnabled && panoramaType === 'closest');
    registerQuickAccessButtonState('screenshot', isScreenshotVisiable);
    registerQuickAccessButtonState('identify', isPopupEnabled);
    registerQuickAccessButtonState('layers', isLayerListVisible);
    registerQuickAccessButtonState('legends', isLegendsToolVisible);
    registerQuickAccessButtonState('lodModel', isLoDModelEnabled);
    registerQuickAccessButtonState('realityModel', isRealityModelEnabled);
    registerQuickAccessButtonState('googleStreet', googleStreet);
  }, [
    isPanoramaEnabled,
    panoramaType,
    isScreenshotVisiable,
    isPopupEnabled,
    isLayerListVisible,
    isLegendsToolVisible,
    isLoDModelEnabled,
    isRealityModelEnabled,
    googleStreet,
    registerQuickAccessButtonState
  ]);


  return (

    <>



      <div
        style={{
          display: 'flex',
          position: 'relative',
          height: isHeaderCollapsed ? '97vh' : '93.6vh',
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >


        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            width: isPanoramaEnabled ? '60%' : '100%',
            height: '100%',
          }}
        >

          <img style={{
            position: "absolute",
            zIndex: "10000",
            bottom: "2px",
            right: "6px",
            cursor: "pointer",
          }} src={esriLogo} onClick={() => window.open('https://www.esri.com', '_blank')} alt="" />

          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '4px',
              zIndex: 50,
            }}
          >
          </div>

          {/* 3D View */}
          <div
            ref={mapContainer3DRef}
            style={{
              height: '100%',
              width: '100%',
              position: 'relative',
            }}
          >


            {/* UI Controls */}
            <div
              style={{
                position: 'absolute',
                top: '6px',
                right: '10px',
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >


              {/* Toolbar starts here  */}

              {isExpanded && (

                <div
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '0px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    backgroundColor: '#2B5DB1', // Matching your header blue
                    padding: '5px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    width: '45px',
                    height: 'auto',
                    alignContent: 'space-between',
                  }}
                >
                  {/* Basic Category */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <MapButton
                      onClick={() => {
                        resetAllStates();
                        toggleCategory('basic'); // Then, toggle the "basic" category
                      }}
                      title={"Basic :\n- Measurement\n- Zoom\n- Location\n- Basemap Transparency\n- Elevation Profile\n- Query Builder\n- Selection Tools\n- Map Rotation\n- Slice Analysis"}
                      icon={Basic}
                      variant="category"
                      style={{
                        background:
                          'linear-gradient(145deg,#93c5fd, rgb(10, 5, 2))',
                        width: '30px',
                        height: '30px',
                      }}
                      iconScale={1.3}
                    />

                    {openCategory === 'basic' && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          marginTop: '5px',
                        }}
                      >
                        <MapButton
                          onClick={() => {
                            if (!isHeightMeasurementWidgetVisible && !isDistanceMeasurementWidgetVisible && !isAreaMeasurementWidgetVisible) {
                              resetAllStates();
                            }
                            setShowOptions(!showOptions);
                            updateRecentTools('Measurement');
                          }}
                          title={"Measurement: \n- Height\n- Distance\n- Area"}
                          icon={measurement}
                          isActive={showOptions || isHeightMeasurementWidgetVisible || isAreaMeasurementWidgetVisible || isDistanceMeasurementWidgetVisible}
                          iconScale={2}
                        />
                        {showOptions && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '40px', // Adjust position below the main button
                              right: '48px',
                              background:
                                'linear-gradient(145deg,rgb(145, 126, 106), #333)',
                              borderRadius: '10px',
                              boxShadow: '0 4px 12px rgba(230, 144, 15, 0.5)',
                              padding: '5px',
                              zIndex: 1000,
                              display: 'flex',
                              height: '44px',
                            }}
                          >
                            <MapButton
                              onClick={() => {
                                if (!isAreaMeasurementWidgetVisible || !isDistanceMeasurementWidgetVisible || isHeightMeasurementWidgetVisible) {
                                  resetAllStates("height")
                                }
                                setIsHeightMeasurementWidgetVisible((prev) => !prev)
                                setIsAreaMeasurementWidgetVisible(false)
                                setIsDistanceMeasurementWidgetVisible(false)
                                updateRecentTools('Height');
                              }}
                              title="Height"
                              icon={Height}
                              isActive={isHeightMeasurementWidgetVisible}
                              style={{ marginRight: '5px' }}
                              iconScale={2}
                            />

                            <MapButton
                              onClick={() => {
                                if (!isAreaMeasurementWidgetVisible || isDistanceMeasurementWidgetVisible || !isHeightMeasurementWidgetVisible) {
                                  resetAllStates("distance")
                                }
                                setIsDistanceMeasurementWidgetVisible((prev) => !prev)
                                setIsAreaMeasurementWidgetVisible(false)
                                setIsHeightMeasurementWidgetVisible(false)
                                updateRecentTools('Distance');
                              }}
                              title="Distance"
                              icon={Distance}
                              isActive={isDistanceMeasurementWidgetVisible}
                              iconScale={2}
                            />

                            <MapButton
                              onClick={() => {
                                if (isAreaMeasurementWidgetVisible || !isDistanceMeasurementWidgetVisible || !isHeightMeasurementWidgetVisible) {
                                  resetAllStates("area")
                                }
                                setIsAreaMeasurementWidgetVisible((prev) => !prev)
                                setIsDistanceMeasurementWidgetVisible(false)
                                setIsHeightMeasurementWidgetVisible(false)
                                updateRecentTools('Area');
                              }}
                              title="Area"
                              icon={Area}
                              isActive={isAreaMeasurementWidgetVisible}
                              style={{ marginLeft: '5px' }}
                              iconScale={2}
                            />
                          </div>
                        )}
                        <MapButton
                          onClick={() => {
                            if (!isZoomToSectionEnabled && !isZoomOutFromSectionEnabled && !isZoomToScaleEnabled) {
                              resetAllStates();
                            }
                            setShowZoom(!showZoom);
                            updateRecentTools('Zoom');
                          }}
                          title={"Zoom: \n- Zoom In\n- Zoom Out\n- Zoom to Scale"}
                          icon={Zomm}
                          isActive={showZoom || isZoomToSectionEnabled || isZoomOutFromSectionEnabled || isZoomToScaleEnabled}
                          iconScale={2}
                          style={{
                            borderRadius: '20px',
                            padding: '8px 12px',
                            width: '33px',
                            height: '33px',
                          }}
                        />
                        {showZoom && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '82px', // Adjust position below the main button
                              right: '48px',
                              background:
                                'linear-gradient(145deg,rgb(145, 126, 106), #333)',
                              borderRadius: '10px',
                              boxShadow: '0 4px 12px rgba(230, 144, 15, 0.5)',
                              padding: '5px',
                              zIndex: 1000,
                              display: 'flex',
                              height: '44px',
                            }}
                          >
                            <MapButton
                              onClick={() => {
                                resetAllStates("zoom in");
                                setIsZoomToSectionEnabled(
                                  !isZoomToSectionEnabled,
                                );
                                setIsZoomOutFromSectionEnabled(false);
                              }}
                              title="Zoom In"
                              icon={section}
                              isActive={isZoomToSectionEnabled}
                              iconScale={2.5}
                              style={{
                                borderRadius: '20px',
                                padding: '8px 12px',
                                width: '33px',
                                height: '33px',
                              }}
                            />
                            <MapButton
                              onClick={() => {
                                resetAllStates("zoom out")
                                setIsZoomOutFromSectionEnabled(
                                  !isZoomOutFromSectionEnabled,
                                );
                                setIsZoomToSectionEnabled(false);
                              }}
                              title="Zoom Out"
                              icon={Zoomout}
                              isActive={isZoomOutFromSectionEnabled}
                              style={{
                                marginLeft: '5px',
                                borderRadius: '20px',
                                padding: '8px 12px',
                                width: '33px',
                                height: '33px',
                              }}
                              iconScale={2.5}
                            />

                            <MapButton
                              onClick={() => {
                                resetAllStates("zoom to")
                                setIsZoomToScaleEnabled(!isZoomToScaleEnabled);
                              }}
                              title="Zoom to Scale"
                              icon={zoomToScale}
                              isActive={isZoomToScaleEnabled}
                              style={{
                                marginLeft: '5px',
                                borderRadius: '20px',
                                padding: '8px 12px',
                                width: '33px',
                                height: '33px',
                              }}
                              iconScale={2}
                            />
                          </div>
                        )}
                        <MapButton
                          onClick={() => {
                            if (!isGotoLocationEnabled && !isMapSearchEnabled && !isGetLocationToolEnabled) {
                              resetAllStates();
                            }
                            setShowLocationTools(!showLocationTools);
                            updateRecentTools('Location');
                          }}
                          title={"Location: \n- Go to Location\n- Search Location\n- Get Location"}
                          icon={get} // use a location-related icon or a group icon
                          isActive={showLocationTools || isGotoLocationEnabled || isMapSearchEnabled || isGetLocationToolEnabled}
                          iconScale={1.5}
                          style={{ width: '35px', height: '35px' }}
                        />

                        {showLocationTools && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '130px', // adjust based on your layout
                              right: '48px',
                              background:
                                'linear-gradient(145deg,rgb(145, 126, 106), #333)',
                              borderRadius: '10px',
                              boxShadow: '0 4px 12px rgba(230, 144, 15, 0.5)',
                              padding: '5px',
                              zIndex: 1000,
                              display: 'flex',
                              height: '44px',
                            }}
                          >
                            <MapButton
                              onClick={() => {
                                resetAllStates("goto")
                                setIsGotoLocationEnabled(!isGotoLocationEnabled);
                                updateRecentTools('Go to Location');
                              }}
                              title="Go to Location"
                              icon={goto}
                              isActive={isGotoLocationEnabled}
                              variant="circle"
                              style={{
                                width: '35px',
                                height: '35px',
                                marginRight: '5px',
                              }}
                              iconScale={1}
                            />
                            <MapButton
                              onClick={() => {
                                resetAllStates("get location")
                                setIsGetLocationToolEnabled(
                                  !isGetLocationToolEnabled,
                                );
                                updateRecentTools('Get Location');
                              }}
                              title="Get Location"
                              icon={get}
                              isActive={isGetLocationToolEnabled}
                              variant="circle"
                              style={{ width: '35px', height: '35px' }}
                              iconScale={1}
                            />
                          </div>
                        )}
                        <MapButton
                          onClick={() => {
                            resetAllStates();
                            setIsBasemapOpacityEnabled(!isBasemapOpacityEnabled);
                            updateRecentTools('Basemap Opacity');
                          }}
                          title="Basemap Transparency"
                          icon="O"
                          isActive={isBasemapOpacityEnabled}
                          style={{
                            borderRadius: '20px',
                            padding: '8px 12px',
                            width: '33px',
                            height: '33px',
                          }}
                          iconScale={2}
                        />
                        <MapButton
                          onClick={() => {
                            resetAllStates();
                            setIsElevationProfileVisible(!isElevationProfileVisible);
                            // updateRecentTools('Elevation Profile');
                          }}
                          title="Elevation Profile"
                          icon={ElevationProfileIcon} // Add your icon here
                          isActive={isElevationProfileVisible}
                          variant="circle"
                          style={{ width: '33px', height: '33px' }}
                          iconScale={1}
                        />
                        <MapButton
                          onClick={() => {
                            resetAllStates();
                            setIsAttributeSearchEnabled(
                              !isAttributeSearchEnabled,
                            );
                            updateRecentTools('Attribute Search');
                          }}
                          title="Query Builder"
                          icon={Attribute}
                          isActive={isAttributeSearchEnabled}
                          style={{
                            borderRadius: '20px',
                            padding: '8px 12px',
                            width: '33px',
                            height: '33px',
                          }}
                          iconScale={2}
                        />
                        <MapButton
                          onClick={() => {
                            resetAllStates();
                            setIsSelectionEnabled(!isSelectionEnabled);
                            updateRecentTools('Selection Tools');
                          }}
                          title="Selection Tools"
                          icon={find} // You'll need to import or create this icon
                          isActive={isSelectionEnabled}
                          style={{
                            borderRadius: '20px',
                            padding: '8px 12px',
                            width: '33px',
                            height: '33px',
                          }}
                          iconScale={2}
                        />

                        <MapButton
                          onClick={() => {
                            resetAllStates("map rotation");
                            setIsMapRotationToolEnabled(!isMapRotationToolEnabled);
                            updateRecentTools('Map Rotation');
                          }}
                          title="Map Rotation"
                          icon={PlaneIcon} // Replace with your rotation icon
                          isActive={isMapRotationToolEnabled}
                          variant="circle"
                          style={{ width: '35px', height: '35px' }}
                          iconScale={1}
                        />
                        <MapButton
                          onClick={() => {
                            resetAllStates("slice")
                            setIsSliceAnalysisEnabled(!isSliceAnalysisEnabled);
                            updateRecentTools('Slice Analysis');
                          }}
                          title="Slice Analysis"
                          icon={CropIcon} // You'll need to import this icon
                          isActive={isSliceAnalysisEnabled}
                          variant="circle"
                          style={{
                            width: '35px',
                            height: '35px',
                          }}
                          iconScale={1}
                        />


                      </div>
                    )}
                  </div>

                  <hr style={separatorStyle} />

                  {/* Advance Category */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <MapButton
                      onClick={() => {
                        resetAllStates();
                        toggleCategory('advance');
                      }}
                      title={"Advance: \n- Visibility Tools \n- Change Detection\n- Buffer Analysis\n- Sanitary Analysis\n- Hoarding near Sensitive Zones\n- Swipe"}
                      icon={Advance}
                      variant="category"
                      style={{
                        background:
                          'linear-gradient(145deg,#93c5fd, rgb(10, 5, 2))',
                        width: '30px',
                        height: '30px',
                      }}
                      iconScale={1.3}
                    />
                    {openCategory === 'advance' && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          marginTop: '5px',
                        }}
                      >
                        <MapButton
                          onClick={() => {
                            resetAllStates();
                            setShowHorizontal(!showHorizontal);
                            updateRecentTools('Change Detection');
                          }}
                          title="Change Detection"
                          icon={Building}
                          isActive={showHorizontal}
                          variant="circle"
                          style={{ width: '30px', height: '30px' }}
                          iconScale={1}
                        />

                        <MapButton
                          onClick={() => {
                            resetAllStates();
                            setIsProximityWidgetEnabled(
                              !isProximityWidgetEnabled,
                            );
                            updateRecentTools('Buffer Analysis');
                          }}
                          title="Buffer Analysis"
                          icon={Proximity}
                          isActive={isProximityWidgetEnabled}
                          style={{
                            borderRadius: '20px',
                            padding: '8px 12px',
                            width: '33px',
                            height: '33px',
                          }}
                          iconScale={2.5}
                        />
                        <MapButton
                          onClick={() => {
                            resetAllStates('swipe');
                            setIsCustomSwipeEnabled(!isCustomSwipeEnabled);
                            updateRecentTools('Layer Comparison');
                          }}
                          title="Swipe"
                          icon="⟷"
                          isActive={isCustomSwipeEnabled}
                          variant="circle"
                          style={{
                            width: '30px',
                            height: '30px',
                            boxShadow: '0 4px 12px rgba(230, 144, 15, 0.5)',
                          }}
                          iconScale={1}
                        />
                        <MapButton
                          onClick={() => {
                            if (!lineOfSightWidgetEnabled && !shadowAnalysisEnabled && !isViewShedEnabled) {
                              resetAllStates();
                            }
                            setShowVisibilityTools(!showVisibilityTools);
                            updateRecentTools('Visibility tools');
                          }}
                          title={"Visibility Tools: \n- Line of Sight\n- Shadow Analysis\n- View Shed"}
                          icon={line3}
                          isActive={showVisibilityTools || lineOfSightWidgetEnabled || shadowAnalysisEnabled || isViewShedEnabled}
                          style={{
                            borderRadius: '20px',
                            padding: '8px 12px',
                            width: '33px',
                            height: '33px',
                          }}
                          iconScale={2}
                        />

                        {showVisibilityTools && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '48px',
                              top: '218px',
                              background:
                                'linear-gradient(145deg,rgb(145, 126, 106), #333)',
                              borderRadius: '10px',
                              boxShadow: '0 4px 12px rgba(230, 144, 15, 0.5)',
                              padding: '5px',
                              zIndex: 1000,
                              display: 'flex',
                              height: '44px',
                            }}
                          >
                            <MapButton
                              onClick={() => {
                                resetAllStates();
                                setLineOfSightWidgetEnabled(!lineOfSightWidgetEnabled);
                                updateRecentTools('Line of Sight');
                              }}
                              title="Line of Sight"
                              icon={line3}
                              isActive={lineOfSightWidgetEnabled}
                              style={{
                                borderRadius: '20px',
                                padding: '8px 12px',
                                width: '33px',
                                height: '33px',
                                marginRight: '5px',
                              }}
                              iconScale={2}
                            />
                            <MapButton
                              onClick={() => {
                                resetAllStates();
                                setShadowAnalysisEnabled(!shadowAnalysisEnabled)
                                // toggleShadowAnalysis();
                                updateRecentTools('Shadow Analysis');
                              }}
                              title="Shadow Analysis"
                              icon={Shadow}
                              isActive={shadowAnalysisEnabled}
                              style={{
                                borderRadius: '20px',
                                padding: '8px 12px',
                                width: '33px',
                                height: '33px',
                                marginRight: '5px',
                              }}
                              iconScale={2}
                            />
                            <MapButton
                              onClick={() => {
                                resetAllStates("view shed");
                                setIsViewShedEnabled(!isViewShedEnabled);
                                updateRecentTools('View Shed');
                              }}
                              title="View Shed"
                              icon="V"
                              isActive={isViewShedEnabled}
                              variant="circle"
                              style={{
                                width: '30px',
                                height: '30px',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <hr style={separatorStyle} />

                  {/* Recent Tools Category */}
                  {/* <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                  > */}
                  {/* <MapButton
                      onClick={() => {
                        resetAllStates();
                        setShowRecentTools(!showRecentTools);
                      }}
                      title="Recent Tools"
                      icon={Recent}
                      isActive={showRecentTools}
                      variant="category"
                      style={{
                        background:
                          'linear-gradient(145deg,#93c5fd, rgb(10, 5, 2))',
                        width: '30px',
                        height: '30px',
                      }}
                      iconScale={1}
                    /> */}
                  {/* </div> */}



                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                  >
                    <MapButton
                      onClick={() => {
                        resetAllStates();
                        window.open("https://oysterpearl.igenesys.com/", '_blank');
                      }}
                      title="Oyster Map"
                      icon={"AI"}
                      isActive={showOysterMap}
                      variant="category"
                      style={{
                        background:
                          'linear-gradient(145deg,#93c5fd, rgb(10, 5, 2))',
                        width: '30px',
                        height: '30px',
                      }}
                      iconScale={1}
                    />
                  </div>
                </div>

              )}
            </div>

            {/* Department Tools */}
            <>

              {/* Water Department Tools */}
              <>
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "showFloodAnalysis" && tool.isEnabled
                  ) && (
                    <FloodAnalysis
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "floodsimulation" && tool.isEnabled
                  ) && (
                    <FloodSimulation
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "undergroundAnalysis" && tool.isEnabled
                  ) && (
                    <UnderGround
                      mapView={view}
                      webMap={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
              </>

              {/* Fire Department Tools */}
              <>
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "fireIncidentMappingTool" && tool.isEnabled
                  ) && (
                    <FireIncedentMapping
                      view={view}
                      webMap={view.map}

                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )}
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "fireBufferTool" && tool.isEnabled
                  ) && (
                    <FireBufferWidget

                      view={view}
                      webMap={view.map}

                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )}
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "fireImpactedBuildingsTool" && tool.isEnabled
                  ) && (
                    <EmergencyBuilding
                      webMap={view.map}
                      mapView={view}

                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )}
              </>

              {/* Assement Department Tools */}
              <>
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "buildingPropertyTaxWidget" && tool.isEnabled
                  ) && (
                    <BuildingPropertyTaxWidget
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "gumastaPendingWidget" && tool.isEnabled
                  ) && (
                    <GumastaPendingWidget
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }

                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "revenuePendingWidget" && tool.isEnabled
                  ) && (
                    <RevenuePendingWidget
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "sacClassificationWidget" && tool.isEnabled
                  ) && (
                    <SACClassificationWidget
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )}
              </>

              {/* Sewerage Department Tools */}
              <>

              </>


              {/* Road & Bridge Department Tools */}
              <>

                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "Impactalalysis" && tool.isEnabled
                  ) && (
                    <ImpactAnalysisWidget
                      view={view}
                      showOptions={true}
                      enabled={true}
                      onClose={() => dispatch(resetDepartment(activeDepartment))} />
                  )
                }

                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "Bridgealysis" && tool.isEnabled
                  ) && (
                    <BridgeConnectedRoads
                      webMap={view.map}
                      mapView={view}
                      onClose={() => dispatch(resetDepartment(activeDepartment))} />
                  )
                }

                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "Emergencyalysis" && tool.isEnabled
                  ) && (
                    <EmergencyBridge
                      webMap={view.map}
                      mapView={view}
                      onClose={() => dispatch(resetDepartment(activeDepartment))} />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "manholeDetection" && tool.isEnabled
                  ) && (
                    <ManholeDetection
                      view={view}
                      map={view.map}
                      enabled={true}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }

                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "roadConstructionMaterial" && tool.isEnabled
                  ) && (
                    <RoadConstructionMaterial
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }

              </>

              {/* Traffic Department Tools */}
              <>

              </>

              {/* Tree Department Tools */}
              <>
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "greenCoverageTool" && tool.isEnabled
                  ) && (
                    <GreenCoverageTool
                      view={view}
                      webMap={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )}
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "plantationScopeTool" && tool.isEnabled
                  ) && (
                    <PlantationScopeTool
                      view={view}
                      webMap={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )}

                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "treePointAnalysis" && tool.isEnabled
                  ) && (
                    <TreePointAnalysis
                      view={view}
                      map={view.map}
                      // enabled={true}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
              </>

              {/* Assesment&Collection Department Tools */}
              <>
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "buildingUsageWidget" && tool.isEnabled
                  ) && (
                    <BuildingUsageWidget
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "buildingConstructionWidget" && tool.isEnabled
                  ) && (
                    <BuildingConstructionWidget
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "buildingAreaWidget" && tool.isEnabled
                  ) && (
                    <BuildingAreaWidget
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "buildingFloorWidget" && tool.isEnabled
                  ) && (
                    <BuildingFloorWidget
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "buildingFloorDiffWidget" && tool.isEnabled
                  ) && (
                    <BuildingFloorDiffWidget
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "building3DWidget" && tool.isEnabled
                  ) && (
                    <Building3DWidget
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }

                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "licenseValidation" && tool.isEnabled
                  ) && (
                    <LicensesDepartment
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }

                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "findlicense" && tool.isEnabled
                  ) && (
                    <BuildingLicenseChecker
                      mapView={view}
                      webMap={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }

                {/* Liscense department */}

                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "emergencyHoardingsTool" && tool.isEnabled
                  ) && (
                    <EmergencyHoardings
                      webMap={view.map}
                      mapView={view}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )}

                {/* Environmet Department */}

                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "silentZoneAnalysis" && tool.isEnabled
                  ) && (
                    <SilentZoneAnalysis
                      view={view}
                      map={view.map}
                      enabled={true}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }

                {/* Solid Waste Management Department */}
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "dumpingGrounds" && tool.isEnabled
                  ) && (
                    <DumpingGrounds
                      view={view}
                      map={view.map}
                      enabled={true}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "swdVehicles" && tool.isEnabled
                  ) && (
                    <SWDVehicles
                      view={view}
                      map={view.map}
                      enabled={true}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "garbageCollectionPoint" && tool.isEnabled
                  ) && (
                    <GarbageCollection
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {/* CCTV Dialog Tool */}
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "cctvDialog" && tool.isEnabled
                  ) && (
                    <CCTVDialog
                      view={view}
                      map={view.map}
                      onClose={() => {
                        dispatch(resetDepartment(activeDepartment));
                      }}
                    />
                  )}

                {/* Dark Spot Analysis Tool */}
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "darkSpotTool" && tool.isEnabled
                  ) && (
                    <DarkSpotTool
                      view={view}
                      webMap={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />

                  )}
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "showRenewal" && tool.isEnabled
                  ) && (
                    <RenewalWidget
                      view={view}
                      webMap={view.map}
                      enabled={true}
                      setEnabled={() => { }}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )}
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "spatialAnalysis" && tool.isEnabled
                  ) && (
                    <SpatialAnalysis
                      map={view.map}
                      view={view}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )}
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "floodingSpots" && tool.isEnabled
                  ) && (
                    <FloodingSpots
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
                {activeDepartment &&
                  reduxDepartments[activeDepartment]?.tools?.some(
                    (tool) => tool.key === "sanitaryAnalysis" && tool.isEnabled
                  ) && (
                    <ToiletDensityAnalysis
                      view={view}
                      map={view.map}
                      onClose={() => dispatch(resetDepartment(activeDepartment))}
                    />
                  )
                }
              </>
            </>


            <>
              {
                isLayerListVisible && view && (
                  <LayerListWidget view={view} map={view.map} isVisible={isLayerListVisible} onClose={() => setIsLayerListVisible(false)} />
                )
              }
            </>

          </div>
        </div>

        {isPanoramaEnabled && panoramaType && (
          <PanoramaViewer
            view={view}
            isPanoramaEnabled={isPanoramaEnabled}
            setIsPanoramaEnabled={setIsPanoramaEnabled}
            panoramaType={panoramaType}
            setPanoramaType={setPanoramaType} // Add this prop to allow component to reset type
          />
        )}
        {isGetLocationToolEnabled && (
          <GetLocationTool
            view={view}
            enabled={isGetLocationToolEnabled}
            onClose={() => setIsGetLocationToolEnabled(false)}
          />
        )}

        {isZoomToSectionEnabled &&
          <ZoomToSection
            views={{ view3D: view }}
            enabled={isZoomToSectionEnabled}
          />
        }
        {isZoomOutFromSectionEnabled &&
          <ZoomOutFromSection
            views={{ view3D: view }}
            enabled={isZoomOutFromSectionEnabled}
          />
        }

        {isZoomToScaleEnabled && (
          <ZoomToScale
            views={{ view3D: view }}
            setIsZoomToScaleEnabled={setIsZoomToScaleEnabled}
          />
        )}

        {isAttributeSearchEnabled && view && (
          <AttributeSearch
            mapView={view}
            webMap={view.map}
            onClose={() => setIsAttributeSearchEnabled(false)}
          />
        )}

        {isSelectionEnabled && view && (
          <Selection
            view={view}
            onClose={() => setIsSelectionEnabled(false)}
          />
        )}
        {/* NOT ADDED HERE NOT DONE HERE  */}
        {isCustomSwipeEnabled && (
          <CustomSwipeTool
            enabled={isCustomSwipeEnabled}
            onClose={() => setIsCustomSwipeEnabled(false)}
          />
        )}

        {isViewShedEnabled && (
          <ViewshedAnalysis view={view} isEnabled={isViewShedEnabled} onClose={() => setIsViewShedEnabled(false)} />
        )}

        {isProximityWidgetEnabled && (
          <CreateProximityWidget
            view={view}
            map={view.map}
            onClose={() => {
              setIsProximityWidgetEnabled((prev) => !prev);
            }}
          />

        )}
        <GetCoordinatesWidget views={{ view3D: view }} />

        {showHorizontal && (
          <HorizontalBuildingFinder
            view={view}
            webMap={view.map}
            position="top-right" // Change position as needed: "top-left", "top-right", "bottom-left", "bottom-right"
            className="my-custom-widget-class" // Add your custom CSS class
            style={{
              top: '56px',
              right: '61px',
              width: '350px',
              backgroundColor: '#f5f5f5',
              border: '2px solid #ddd',
              borderRadius: '8px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
            }}
            onClose={() => setShowHorizontal(false)}
          />

        )}

        {showBuilding2024 && (

          <Building2024
            mapView={view}
            webMap={view.map}
            position="top-right"
            className="my-custom-widget-class"
            style={{
              top: '56px',
              right: '61px',
              width: '350px',
              backgroundColor: '#f5f5f5',
              border: '2px solid #ddd',
              borderRadius: '8px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
            }}
            onClose={() => setShowBuilding2024(false)}
          />

        )}
        {isBasemapOpacityEnabled && view && (
          <BasemapOpacity
            mapView={view}
            webMap={view.map}
            onClose={() => setIsBasemapOpacityEnabled(false)}
          />
        )}

        {isGotoLocationEnabled &&
          <GotoLocationTool
            views={{ view3D: view }}
            enabled={isGotoLocationEnabled}
            onClose={() => setIsGotoLocationEnabled(false)}
          />
        }
        {isMapRotationToolEnabled && (

          <MapRotationComponent
            view={view}
            enabled={isMapRotationToolEnabled}
            onClose={() => setIsMapRotationToolEnabled(false)}
          />

        )}
        {emergencyBuildingEnabled && (

          <EmergencyBuilding
            webMap={view.map}
            mapView={view}
            onClose={() => setEmergencyBuildingEnabled(false)}
          />

        )}

        {isMapSearchEnabled && (
          <MapSearchWidget
            view={view}
            enabled={isMapSearchEnabled}
            onClose={() => setIsMapSearchEnabled(false)}
          />
        )}
        {lineOfSightWidgetEnabled && (
          <LineOfSightWidget view={view} onClose={() => setLineOfSightWidgetEnabled(false)} />

        )}

        {showBasemapGallery &&
          <BasemapGalleryComponent
            view={view}
            isVisible={showBasemapGallery}
            onClose={() => setShowBasemapGallery(false)}
          />

        }

        {isPopupEnabled && (
          <CustomMapPopup view={view} isEnabled={isPopupEnabled} onClose={() => setIsPopupEnabled(false)} />

        )}

        <SearchLocationTool
          view={view}
        />

        <GoogleStreetViewRedirect
          view={view}
          enabled={googleStreet}
          onRedirect={handleGoogleStreetRedirect}
        />

        {
          isScreenshotVisiable && (
            <ScreenshotTool sceneView={view} mapView={view} isEnabled={isScreenshotVisiable} onClose={
              () => setIsScreenshotVisiable(false)
            } />
          )
        }

        {
          isHeightMeasurementWidgetVisible && (
            <HeightMeasurementWidget view={view} onClose={
              () => setIsHeightMeasurementWidgetVisible(false)
            } />

          )
        }
        {
          isAreaMeasurementWidgetVisible && (
            <AreaMeasurementWidget view={view} onClose={
              () => setIsAreaMeasurementWidgetVisible(false)
            } />

          )
        }
        {
          isDistanceMeasurementWidgetVisible && (
            <DistanceMeasurementWidget view={view} onClose={
              () => setIsDistanceMeasurementWidgetVisible(false)
            } />

          )
        }
        {shadowAnalysisEnabled && (
          <ShadowAnalysisWidget view={view} onClose={() => setShadowAnalysisEnabled(false)} />

        )}
        {showRecentTools && (
          <RecentToolsPanel
            recentTools={recentTools}
            onToolClick={handleRecentToolClick}
            onClose={() => setShowRecentTools(false)}
          />
        )}

        {/* {showOysterMap && (
                <OysterMap open={showOysterMap} onClose={() => setShowOysterMap(false)} />

        )} */}
        {isSliceAnalysisEnabled &&

          <SliceAnalysisTool
            view={view}
            onClose={() => setIsSliceAnalysisEnabled(false)}

          />

        }

        {isElevationProfileVisible && (

          <ElevationProfileWidget
            view={view}
            onClose={() => setIsElevationProfileVisible(false)}
          />

        )}


      </div>




    </>
  );
};

export default TwoDMap;
