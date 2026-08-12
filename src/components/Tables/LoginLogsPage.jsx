import React, { useState, useEffect, useRef } from 'react';
import { BeatLoader } from 'react-spinners';
import { MdViewColumn } from 'react-icons/md';
import { TfiAngleLeft, TfiAngleRight } from 'react-icons/tfi';
import { AiOutlineEye } from 'react-icons/ai';
import { NavLink } from 'react-router-dom';
import Modal from 'react-modal';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Icon, Fill, Stroke, Circle } from 'ol/style';
import { fromLonLat } from 'ol/proj';

// Set app element for react-modal
if (typeof window !== 'undefined' && document.getElementById('root')) {
  Modal.setAppElement('#root');
}

// Helper function to detect dark mode
const isDarkMode = () => document.documentElement.classList.contains('dark');

const LoginLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10,
  });

  // Modal states
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const mapRef = useRef();
  const mapInstanceRef = useRef(null);

  // Column Filter States - Updated to include coordinates column and actions
  const [columnFilter, setColumnFilter] = useState({
    id: true,
    user_id: true,
    user_name: true,
    email: true,
    department_name: true,
    role_name: true,
    timestamp: true,
    ip_address: true,
    user_agent: true,
    login_status: true,
    failure_reason: true,
    session_token_hash: false,
    city: true,
    region: true,
    country: true,
    country_code: false,
    coordinates: true, // Combined lat,long column
    isp: true,
    postal_code: true,
    timezone: true,
    organization: true,
    actions: true, // Actions column
  });
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const filterRef = useRef(null);

  const apiUrl = import.meta.env.VITE_BASE_URL;
  const token = localStorage.getItem('token');

  // Add scrollbar styling to head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Custom thin scrollbar for the table */
      .thin-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      .thin-scrollbar::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }

      .thin-scrollbar::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 10px;
      }

      .thin-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
      }

      /* Dark mode scrollbar */
      .dark .thin-scrollbar::-webkit-scrollbar-track {
        background: #2d3748;
      }

      .dark .thin-scrollbar::-webkit-scrollbar-thumb {
        background: #4a5568;
      }

      .dark .thin-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #2d3748;
      }

      /* Firefox scrollbar */
      .thin-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #c1c1c1 #f1f1f1;
      }

      .dark .thin-scrollbar {
        scrollbar-color: #4a5568 #2d3748;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch data on mount and when pagination changes
  useEffect(() => {
    fetchLoginLogs();
  }, [pagination.currentPage]);

  // Column Filter Logic
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        showColumnFilter &&
        !event.target.closest('.column-filter') &&
        !event.target.closest('.filter-btn')
      ) {
        setShowColumnFilter(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showColumnFilter]);

  // Initialize map when modal opens - Fixed version
  useEffect(() => {
    if (mapModalOpen && selectedLocation) {
      // Use longer timeout and multiple attempts to ensure modal is fully rendered
      const timer = setTimeout(() => {
        initializeMap();
      }, 300);
      
      return () => {
        clearTimeout(timer);
        cleanupMap();
      };
    }
  }, [mapModalOpen, selectedLocation]);

  const cleanupMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setTarget(null);
      mapInstanceRef.current = null;
    }
  };

  const initializeMap = () => {
    if (!selectedLocation || !mapRef.current) {
      console.warn('Map ref or selected location not available');
      return;
    }

    const { latitude, longitude, user_name, city, region, country } = selectedLocation;
    
    console.log('Initializing map with coordinates:', { latitude, longitude });
    console.log('Map container element:', mapRef.current);
    
    if (latitude && longitude) {
      try {
        // Clean up existing map first
        cleanupMap();

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lon)) {
          console.error('Invalid coordinates:', { lat, lon });
          return;
        }

        // Transform coordinates to Web Mercator projection
        const coordinates = fromLonLat([lon, lat]);
        console.log('Transformed coordinates:', coordinates);
        
        // Create marker feature
        const marker = new Feature({
          geometry: new Point(coordinates),
          name: `${user_name} - ${city}, ${region}, ${country}`,
        });

        // Create a proper location pin marker using SVG data URI
        const locationPinSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 30">
            <path fill="#FF0000" stroke="#FFFFFF" stroke-width="2" d="M12 0C7.03 0 3 4.03 3 9c0 7.5 9 21 9 21s9-13.5 9-21c0-4.97-4.03-9-9-9zm0 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
          </svg>
        `)}`;

        const markerStyle = new Style({
          image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: locationPinSvg,
            scale: 1.2,
            opacity: 1,
          }),
        });

        // Create vector source and layer
        const vectorSource = new VectorSource({
          features: [marker],
        });

        const vectorLayer = new VectorLayer({
          source: vectorSource,
          style: markerStyle,
        });

        // Create tile layer
        const tileLayer = new TileLayer({
          source: new OSM(),
        });

        // Create the map view
        const view = new View({
          center: coordinates,
          zoom: 15,
        });

        // Create the map
        const map = new Map({
          target: mapRef.current,
          layers: [tileLayer, vectorLayer],
          view: view,
        });

        // Store map instance reference
        mapInstanceRef.current = map;

        console.log('Map created successfully');

        // Multiple attempts to force map rendering - This is the key fix
        const forceRender = () => {
          if (mapInstanceRef.current && mapRef.current) {
            console.log('Forcing map update...');
            mapInstanceRef.current.updateSize();
            mapInstanceRef.current.renderSync();
            
            // Additional size update after a delay
            setTimeout(() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.updateSize();
                console.log('Final map size update completed');
              }
            }, 100);
          }
        };

        // Force render immediately and after delays
        setTimeout(forceRender, 100);
        setTimeout(forceRender, 500);
        setTimeout(forceRender, 1000);

        // Also listen for when the modal animation completes
        const modalContent = mapRef.current.closest('.ReactModal__Content');
        if (modalContent) {
          const observer = new MutationObserver(() => {
            forceRender();
          });
          observer.observe(modalContent, { attributes: true, attributeFilter: ['style'] });
          
          setTimeout(() => observer.disconnect(), 2000);
        }

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }
  };

  const fetchLoginLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${apiUrl}/auth/login-history?page=${pagination.currentPage}&limit=10`,
        {
          method: 'GET',
          headers: {
            'Authorization': token,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch login logs');
      }

      const data = await response.json();
      console.log('API Response:', data);
      setLogs(data.logs || []);
      setPagination((prev) => ({
        ...prev,
        totalPages: data.pagination?.totalPages || 1,
      }));
    } catch (err) {
      setError(err.message || 'Failed to fetch login logs');
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination handler
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  // Handle view location
  const handleViewLocation = (log) => {
    console.log('Opening location for user:', log);
    if (log.latitude && log.longitude) {
      setSelectedLocation({
        latitude: log.latitude,
        longitude: log.longitude,
        user_name: log.user_name,
        city: log.city,
        region: log.region,
        country: log.country,
        email: log.email,
      });
      setMapModalOpen(true);
    } else {
      console.warn('No coordinates available for user:', log);
    }
  };

  // Close modal handler
  const closeModal = () => {
    setMapModalOpen(false);
    setSelectedLocation(null);
    cleanupMap();
  };

  // Handle modal after open - This ensures proper rendering
  const handleAfterOpenModal = () => {
    console.log('Modal opened, initializing map...');
    // Additional delay to ensure modal animation is complete
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.updateSize();
        mapInstanceRef.current.renderSync();
      }
    }, 200);
  };

  // Column order for display - Updated to include coordinates and actions
  const columnOrder = [
    'id',
    'user_id',
    'user_name',
    'email',
    'department_name',
    'role_name',
    'timestamp',
    'login_status',
    'failure_reason',
    'ip_address',
    'user_agent',
    'session_token_hash',
    'city',
    'region',
    'country',
    'country_code',
    'postal_code',
    'timezone',
    'isp',
    'organization',
    'coordinates', // Combined lat,long
    'actions', // Actions column
  ];

  // Format column names for display - Updated
  const formatColumnName = (column) => {
    const nameMap = {
      id: 'ID',
      user_id: 'User ID',
      user_name: 'User Name',
      email: 'Email',
      department_name: 'Department',
      role_name: 'Role',
      timestamp: 'Login Time',
      ip_address: 'IP Address',
      user_agent: 'User Agent',
      login_status: 'Status',
      failure_reason: 'Failure Reason',
      session_token_hash: 'Session Token',
      city: 'City',
      region: 'Region',
      country: 'Country',
      country_code: 'Country Code',
      coordinates: 'Coordinates',
      isp: 'ISP',
      postal_code: 'Postal Code',
      timezone: 'Timezone',
      organization: 'Organization',
      actions: 'Actions',
    };
    return nameMap[column] || column;
  };

  // Truncate long text with tooltip
  const truncateText = (text, maxLength = 30) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const renderCellValue = (fieldName, value, log) => {
    if (fieldName === 'actions') {
      return (
        <div className="flex justify-center">
          <button
            onClick={() => handleViewLocation(log)}
            disabled={!log.latitude || !log.longitude}
            className={`p-2 rounded-full transition-colors ${
              log.latitude && log.longitude
                ? 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title={log.latitude && log.longitude ? 'View location on map' : 'Location not available'}
          >
            <AiOutlineEye size={18} />
          </button>
        </div>
      );
    }

    if (fieldName === 'coordinates') {
      if (log.latitude && log.longitude) {
        return (
          <span className="font-mono text-sm">
            {parseFloat(log.latitude).toFixed(6)}, {parseFloat(log.longitude).toFixed(6)}
          </span>
        );
      }
      return 'N/A';
    }

    if (value === null || value === undefined) return 'N/A';

    switch (fieldName) {
      case 'timestamp':
        return new Date(value).toLocaleString();
      case 'login_status':
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${value === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        );
      case 'user_agent':
      case 'session_token_hash':
        return (
          <span title={value} className="font-mono text-sm">
            {truncateText(value, 25)}
          </span>
        );
      default:
        return <span className="text-sm">{value}</span>;
    }
  };

  // Modal styles - Updated for better rendering
  const modalStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
    },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '900px',
      height: '85%',
      maxHeight: '700px',
      padding: '0',
      borderRadius: '12px',
      backgroundColor: isDarkMode() ? '#1f2937' : '#ffffff',
      color: isDarkMode() ? '#ffffff' : '#000000',
      border: 'none',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      overflow: 'hidden',
    },
  };

  return (
    <div className="p-5 bg-white rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <BeatLoader color={isDarkMode() ? '#2563eb' : '#2563eb'} />
        </div>
      ) : (
        <>
          {/* Header + Filter Button */}
          <div className="flex justify-between items-center mb-4">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                <li className="breadcrumb-item hover:text-black dark:hover:text-gray-200">
                  <NavLink to="/dashboard">Home</NavLink>
                </li>
                <li className="text-gray-500 dark:text-gray-400">&gt;</li>
                <li
                  className="breadcrumb-item text-gray-800 dark:text-gray-200 font-medium"
                  aria-current="page"
                >
                  Login History
                </li>
              </ol>
            </nav>
            <div className="flex space-x-4 relative">
              <button
                className="filter-btn bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColumnFilter((prev) => !prev);
                }}
              >
                <MdViewColumn className="inline-block mr-1" />
                Filter Columns
              </button>

              {showColumnFilter && (
                <div
                  ref={filterRef}
                  className="column-filter absolute bg-gray-900 text-white p-4 rounded shadow-lg z-50 thin-scrollbar"
                  style={{ right: '0', top: '3rem', width: '220px', maxHeight: '400px', overflowY: 'auto' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h4 className="text-lg font-semibold text-white mb-3 sticky top-0 bg-gray-900">
                    Filter Columns
                  </h4>
                  {columnOrder.map((column) => (
                    <div key={column} className="mb-2">
                      <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={columnFilter[column]}
                          onChange={() =>
                            setColumnFilter((prev) => ({
                              ...prev,
                              [column]: !prev[column],
                            }))
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="accent-blue-600"
                        />
                        <span className="text-sm">{formatColumnName(column)}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Login Logs Table - Added thin-scrollbar class */}
          <div className="overflow-x-auto border rounded-lg dark:border-gray-600 thin-scrollbar">
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-gray-200 dark:bg-gray-700 sticky top-0">
                <tr>
                  {columnOrder.map((column) => (
                    columnFilter[column] && (
                      <th
                        key={column}
                        className="px-4 py-2 text-left font-semibold whitespace-nowrap border-r dark:border-gray-600"
                      >
                        {formatColumnName(column)}
                      </th>
                    )
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs && logs.length > 0 ? (
                  logs.map((log, index) => (
                    <tr
                      key={log.id || index}
                      className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      {columnOrder.map((column) => (
                        columnFilter[column] && (
                          <td
                            key={`${log.id}-${column}`}
                            className="py-3 px-4 border-r dark:border-gray-600"
                          >
                            {column === 'id'
                              ? index + 1 + (pagination.currentPage - 1) * pagination.itemsPerPage
                              : renderCellValue(column, log[column], log)}
                          </td>
                        )
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={Object.values(columnFilter).filter(Boolean).length}
                      className="py-5 px-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      No login history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pagination flex justify-end items-center mt-4 gap-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className={`pagination-btn flex items-center px-4 py-2 rounded-md ${pagination.currentPage === 1
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              <TfiAngleLeft size={22} className="mr-1" />
              Previous
            </button>
            <span className="pagination-info text-gray-800 font-bold dark:text-gray-200">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className={`pagination-btn flex items-center px-4 py-2 rounded-md ${pagination.currentPage === pagination.totalPages
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              Next
              <TfiAngleRight size={22} className="ml-1" />
            </button>
          </div>

          {/* Map Modal - Fixed Version */}
          <Modal
            isOpen={mapModalOpen}
            onRequestClose={closeModal}
            onAfterOpen={handleAfterOpenModal}
            style={modalStyles}
            contentLabel="User Location Map"
          >
            <div className="h-full flex flex-col">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">User Location</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
              
              {/* User Info */}
              {selectedLocation && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>User:</strong> {selectedLocation.user_name}</div>
                    <div><strong>Email:</strong> {selectedLocation.email}</div>
                    <div><strong>Location:</strong> {selectedLocation.city}, {selectedLocation.region}, {selectedLocation.country}</div>
                    <div><strong>Coordinates:</strong> {parseFloat(selectedLocation.latitude).toFixed(6)}, {parseFloat(selectedLocation.longitude).toFixed(6)}</div>
                  </div>
                </div>
              )}
              
              {/* Map Container - Fixed styling */}
              <div className="flex-1 p-4 bg-white dark:bg-gray-800">
                <div 
                  ref={mapRef} 
                  className="w-full h-full rounded-lg border border-gray-300 dark:border-gray-600"
                  style={{ 
                    minHeight: '450px',
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                  }}
                />
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default LoginLogs;
