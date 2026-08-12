import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import './css/style.css';
import './css/satoshi.css';
import 'flatpickr/dist/flatpickr.min.css';
import { MapProvider } from './context/MapContext';
import { ToolbarProvider } from './context/ToolbarContext';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { CCMCMapProvider } from './context/CCMCContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <Router future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }}
    basename="/mumbai" > {/* Router must be wrapped first */}
    <MapProvider>
      <CCMCMapProvider>

        <ToolbarProvider>

          <AuthProvider> {/* Now AuthProvider is inside Router */}
            <Provider store={store}>

              <App />
            </Provider>
          </AuthProvider>
        </ToolbarProvider>
      </CCMCMapProvider>
    </MapProvider>
  </Router>
);
