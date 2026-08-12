import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const AuthContext = createContext();
const SessionTimerContext = createContext();

const INACTIVITY_TIMEOUT_ENABLED = false;

const Time = 5; // Inactivity timeout in minutes
// ─── INACTIVITY TIMEOUT  ──────────────────────────────────────
const INACTIVITY_TIMEOUT = Time * 60 * 1000; // 5 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
// ─────────────────────────────────────────────────────────────────────────────


export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const logoutTimer = useRef(null);

  const decodeToken = (token) => {
    try {
      const base64Payload = token.split(".")[1];
      const payload = atob(base64Payload);
      return JSON.parse(payload);
    } catch (e) {
      return null;
    }
  };

  // Initialize state with values from localStorage
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const user = token ? JSON.stringify(decodeToken(token)) : null;
    return {
      token,
      user,
      isAuthenticated: !!token,
    };
  });

  // State for session modal
  const [sessionModal, setSessionModal] = useState({
    isOpen: false,
    message: "",
    is401: false,
  });

  const [timeLeft, setTimeLeft] = useState(INACTIVITY_TIMEOUT);
  const expiryRef = useRef(Date.now() + INACTIVITY_TIMEOUT);
  const [tokenTimeLeft, setTokenTimeLeft] = useState(null);
  // ─── INACTIVITY TIMER   ────────────────────────────────────────
  const resetTimer = useCallback(() => {
    clearTimeout(logoutTimer.current);
    expiryRef.current = Date.now() + INACTIVITY_TIMEOUT;
    logoutTimer.current = setTimeout(() => {
      localStorage.removeItem("token");
      setSessionModal({
        isOpen: true,
        message: `You have been logged out due to ${Time} minutes of inactivity.`,
        is401: false,
      });
    }, INACTIVITY_TIMEOUT);
  }, []);

  // ─── ACTIVITY LISTENERS  ──────────────────────────────────────
  useEffect(() => {
    if (!auth.isAuthenticated || !INACTIVITY_TIMEOUT_ENABLED) {
      clearTimeout(logoutTimer.current);
      return;
    }
    resetTimer();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetTimer));
    return () => {
      clearTimeout(logoutTimer.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [auth.isAuthenticated]);
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) {
      setTokenTimeLeft(null);
      return;
    }

    const decoded = decodeToken(auth.token);
    if (!decoded?.exp) {
      setTokenTimeLeft(null);
      return;
    }

    const expiryMs = decoded.exp * 1000;

    const tick = () => {
      setTokenTimeLeft(Math.max(0, expiryMs - Date.now()));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [auth.isAuthenticated, auth.token, auth.user]);

  useEffect(() => {
    if (!auth.isAuthenticated || !INACTIVITY_TIMEOUT_ENABLED) return;
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, expiryRef.current - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [auth.isAuthenticated]);

  // Check token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = token ? JSON.stringify(decodeToken(token)) : null;
    setAuth({
      token,
      user,
      isAuthenticated: !!token,
    });
  }, []);

  // Set up axios interceptor — handles 401 (token expired server-side)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login/ad')) {
          clearTimeout(logoutTimer.current);
          localStorage.removeItem("token");
          setSessionModal({
            isOpen: true,
            message: "Your session has expired. Please log in again.",
            is401: true,
          });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('token');
      setSessionModal({
        isOpen: true,
        message: 'Your session has expired. Please log in again.',
        is401: true,
      });
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  useEffect(() => {
    if (tokenTimeLeft === 0 && auth.isAuthenticated) {
      setSessionModal({
        isOpen: true,
        message: "Your session token has expired. Please log in again.",
        is401: true,
      });
    }
  }, [tokenTimeLeft, auth.isAuthenticated]);

  // Periodic auth check every 5 minutes - COMMENTED OUT
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     checkAuthStatus();
  //   }, 5 * 60 * 1000);
  //   checkAuthStatus();
  //   return () => clearInterval(interval);
  // }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    const user = JSON.stringify(decodeToken(token));
    setAuth({ token, user, isAuthenticated: true });

    const from = location.state?.from || "/map";
    navigate(from, { replace: true });
  };

  const logout = () => {
    clearTimeout(logoutTimer.current);
    localStorage.removeItem("token");
    setAuth({ token: null, user: null, isAuthenticated: false });

    if (sessionStorage.getItem("logout401")) {
      sessionStorage.removeItem("logout401");
      window.location.href = "/mumbai";
    } else {
      navigate("/", { state: { message: "Successfully logged out!" } });
    }
  };

  const handleModalOk = () => {
    const is401 = sessionModal.is401;
    setSessionModal({ isOpen: false, message: "", is401: false });

    if (is401) {
      sessionStorage.setItem("logout401", "true");
    }

    logout();
  };

  const authValue = useMemo(
    () => ({ auth, login, logout }),
    [auth]
  );

  const timerValue = useMemo(
    () => ({ timeLeft, tokenTimeLeft }),
    [timeLeft, tokenTimeLeft]
  );

  return (
    <AuthContext.Provider value={authValue}>
      <SessionTimerContext.Provider value={timerValue}>
        {children}
        {sessionModal.isOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '400px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                🔒
              </div>

              <h3>Session Expired</h3>
              <p>{sessionModal.message}</p>

              <button
                onClick={handleModalOk}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 2rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </SessionTimerContext.Provider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export const useSessionTimer = () => useContext(SessionTimerContext);