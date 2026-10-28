// Entry point of SolarSight (solarsight/index.html), the GeoServer + CesiumJS product. Kept separate from
// src/main.jsx so the existing ArcGIS application is not touched.
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/solarsight`}>
    <App />
  </BrowserRouter>,
);
