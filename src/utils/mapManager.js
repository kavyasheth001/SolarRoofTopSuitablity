/**
 * mapManager.js — Singleton ArcGIS SceneView manager
 *
 * One SceneView and one WebScene are created for the entire app lifetime.
 * All map components attach/detach via view.container instead of destroying
 * and recreating the view on every route change.
 * The map initializes on-demand only when a map page is first visited.
 *
 * Usage:
 *   import * as mapManager from '../utils/mapManager';
 *
 *   // Inside a map component mount:
 *   await mapManager.attachTo(containerDiv);
 *   const view = mapManager.getView();
 *
 *   // Inside a map component unmount:
 *   mapManager.detach();
 */

// ─── Module-level singleton state ────────────────────────────────────────────
let _view = null;
let _map = null;
let _initPromise = null; // resolves once view is ready, reused on subsequent calls

// ─── initialize ──────────────────────────────────────────────────────────────
/**
 * Creates the SceneView exactly once.
 * On repeated calls it immediately returns the existing promise.
 *
 * @param {HTMLElement} containerDiv  – the div to render into during init
 * @param {Function}    onViewReady   – callback(view) → typically setSceneView from MapContext
 * @param {Function}    onMapReady    – callback(map)  → typically setWebscene  from MapContext
 * @returns {Promise<void>}
 */
export function initialize(containerDiv, onViewReady, onMapReady) {
  if (_initPromise) return _initPromise;

  _initPromise = _doInitialize(containerDiv, onViewReady, onMapReady);
  return _initPromise;
}

async function _doInitialize(containerDiv, onViewReady, onMapReady) {
  // Dynamic imports so the ArcGIS SDK is only loaded once the user is authed.
  const [
    { default: esriConfig },
    { default: esriRequest },
    { default: IdentityManager },
    { default: WebScene },
    { default: SceneView },
    { default: ScaleBar },
    { default: Locate },
  ] = await Promise.all([
    import('@arcgis/core/config'),
    import('@arcgis/core/request'),
    import('@arcgis/core/identity/IdentityManager'),
    import('@arcgis/core/WebScene'),
    import('@arcgis/core/views/SceneView'),
    import('@arcgis/core/widgets/ScaleBar'),
    import('@arcgis/core/widgets/Locate'),
  ]);

  // ── Step 1: Configure portal URL ──────────────────────────────────────────
  esriConfig.portalUrl = `${import.meta.env.VITE_PORTAL_URL}/portal`;

  // ── Step 2: Silent login to primary portal (MUST come before new WebScene) ─
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

    console.log('[mapManager] Primary portal token registered.');
    IdentityManager.registerToken({
      server: `${portalUrl}/sharing/rest`,
      token: response.data.token,
      userId: username,
      expires: Date.now() + 60 * 60 * 1000,
    });
  }

  try {
    await loginSilentlyToPortal({
      username: import.meta.env.VITE_PORTAL_USERNAME,
      password: import.meta.env.VITE_PORTAL_PASSWORD,
      portalUrl: `${import.meta.env.VITE_PORTAL_URL}/portal`,
    });
  } catch (err) {
    console.warn('[mapManager] Primary portal silent login failed, continuing anyway:', err);
  }

  // ── Step 3: Silent login to second portal (non-blocking) ──────────────────
  if (import.meta.env.VITE_SECOND_PORTAL_URL) {
    (async () => {
      try {
        const tokenServiceUrl2 = `${import.meta.env.VITE_SECOND_PORTAL_URL}/sharing/rest/generateToken`;
        const response2 = await esriRequest(tokenServiceUrl2, {
          method: 'post',
          query: {
            username: import.meta.env.VITE_SECOND_PORTAL_USERNAME,
            password: import.meta.env.VITE_SECOND_PORTAL_PASSWORD,
            referer: window.location.origin,
            f: 'json',
          },
        });
        if (response2?.data?.token) {
          IdentityManager.registerToken({
            server: `${import.meta.env.VITE_SECOND_PORTAL_URL}/sharing/rest`,
            token: response2.data.token,
            userId: import.meta.env.VITE_SECOND_PORTAL_USERNAME,
            expires: Date.now() + 60 * 60 * 1000,
          });
          console.log('[mapManager] Second portal token registered.');
        }
      } catch (e) {
        console.warn('[mapManager] Second portal silent login failed:', e);
      }
    })();
  }

  // ── Step 4: Create WebScene & SceneView ───────────────────────────────────
  const webscene = new WebScene({
    portalItem: { id: import.meta.env.VITE_WEBSCENE_ID },
  });

  const sceneView = new SceneView({
    container: containerDiv,
    map: webscene,
    camera: {
      position: [72.8777, 19.076, 800],
      tilt: 60,
    },
    environment: {
      atmosphereEnabled: true,
      background: null,
      lighting: { type: 'sun' },
      weather: { type: 'cloudy' },
    },
    qualityProfile: 'medium',
  });

  // Disable default popup — individual tools opt-in
  sceneView.popupEnabled = false;

  // ── Step 5: Wait for webscene, then add standard widgets ──────────────────
  await webscene.when();

  const scaleBar = new ScaleBar({
    view: sceneView,
    unit: 'metric',
    style: 'ruler',
  });
  sceneView.ui.add(scaleBar, 'bottom-right');

  sceneView.when(() => {
    // Fly to Mumbai on first load
    sceneView.goTo({
      center: [72.847187, 18.999758],
      zoom: 12.3,
      tilt: 65,
    });

    // Add locate widget (only if not already present)
    const existing = sceneView.ui.find('locate-widget');
    if (!existing) {
      const locate = new Locate({
        view: sceneView,
        useHeadingEnabled: false,
        goToOverride: (v, params) => {
          params.target.zoom = 15;
          return v.goTo(params.target);
        },
      });
      sceneView.ui.add(locate, 'top-left');
    }
  });

  // ── Step 6: Store and broadcast ───────────────────────────────────────────
  _view = sceneView;
  _map  = webscene;

  if (typeof onViewReady === 'function') onViewReady(sceneView);
  if (typeof onMapReady  === 'function') onMapReady(webscene);

  console.log('[mapManager] SceneView initialized.');
}

// ─── attachTo ────────────────────────────────────────────────────────────────
/**
 * Moves the live SceneView into the given container div.
 * On first call across the app, initializes the singleton WebScene and SceneView on-demand.
 * On subsequent calls, instantly re-parents the existing view into the container.
 *
 * @param {HTMLElement} containerDiv
 * @param {Function}    [onViewReady]
 * @param {Function}    [onMapReady]
 */
export async function attachTo(containerDiv, onViewReady, onMapReady) {
  if (!containerDiv) return;

  // On first access, initialize directly into this container div
  if (!_initPromise) {
    console.log('[mapManager] First map access — initializing SceneView into provided container.');
    _initPromise = _doInitialize(containerDiv, onViewReady, onMapReady);
  }

  await _initPromise;

  // Re-parent only if the view isn't already in this container
  if (_view && _view.container !== containerDiv) {
    _view.container = containerDiv;
  }

  if (typeof onViewReady === 'function' && _view) onViewReady(_view);
  if (typeof onMapReady  === 'function' && _map)  onMapReady(_map);
}

// ─── detach ──────────────────────────────────────────────────────────────────
/**
 * Detaches the SceneView from its current container.
 * The view stays alive — only its DOM attachment is removed.
 */
export function detach() {
  if (_view) {
    _view.container = null;
  }
}

// ─── getView / getMap ─────────────────────────────────────────────────────────
/** Returns the live SceneView (or null if not yet initialized). */
export function getView() {
  return _view;
}

/** Returns the live WebScene (or null if not yet initialized). */
export function getMap() {
  return _map;
}

/**
 * Returns a Promise that resolves to the view once initialization is complete.
 * Useful for components that need to await the view after calling attachTo().
 */
export function whenReady() {
  if (!_initPromise) return Promise.resolve(null);
  return _initPromise.then(() => _view);
}
