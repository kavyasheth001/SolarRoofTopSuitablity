// Entry point of the standalone GeoServer map page (geoserver-map.html).
// Kept separate from src/main.jsx so the existing ArcGIS application is not touched.
import ReactDOM from 'react-dom/client';
import GeoServerMap from './GeoServerMap';

ReactDOM.createRoot(document.getElementById('root')).render(<GeoServerMap />);
