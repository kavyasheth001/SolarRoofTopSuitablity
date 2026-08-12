import { useEffect } from "react";
import { WifiOff, ServerOff } from "lucide-react";
import { useConnectionStore } from "../../store/useConnectionStore";

const API_BASE_URL = import.meta.env.VITE_BASE_URL;

export default function SystemStatusIndicator() {
  const {
    isOnline,
    isBackendConnected,
    setOnlineStatus,
    setBackendStatus,
  } = useConnectionStore();

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setOnlineStatus(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnlineStatus]);

  useEffect(() => {
    const checkBackend = async () => {
      
      try {
        const res = await fetch(`${API_BASE_URL}/api/health?t=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });
        setBackendStatus(res.ok);
      } catch (err) {
        setBackendStatus(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 60000);
    return () => clearInterval(interval);
  }, [setBackendStatus]);

  if (isOnline && isBackendConnected) return null;

  return (
    <>
      <style>{`
        @keyframes statusBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .status-blink {
          animation: statusBlink 2s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: default;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .status-blink:hover {
          animation-play-state: paused;
          transform: scale(1.15);
        }

        /* ── Light Mode ── */
        .status-internet {
          background: #ef444418;
          color: #dc2626;
          border: 1px solid #ef444440;
        }
        .status-internet:hover {
          filter: drop-shadow(0 0 6px #ef4444);
        }
        .status-backend {
          background: #f59e0b18;
          color: #d97706;
          border: 1px solid #f59e0b40;
        }
        .status-backend:hover {
          filter: drop-shadow(0 0 6px #f59e0b);
        }

        /* ── Dark Mode (Tailwind .dark class) ── */
        .dark .status-internet {
          background: rgba(239,68,68,0.15);
          color: #f87171;
          border: 1px solid rgba(239,68,68,0.35);
        }
        .dark .status-internet:hover {
          filter: drop-shadow(0 0 7px #f87171);
        }
        .dark .status-backend {
          background: rgba(245,158,11,0.15);
          color: #fbbf24;
          border: 1px solid rgba(245,158,11,0.35);
        }
        .dark .status-backend:hover {
          filter: drop-shadow(0 0 7px #fbbf24);
        }

        /* ── Your App's Custom Dark Theme ──
           Targets the data-theme or a root class your app uses.
           Adjust the selector below to match your actual root class/attribute.
        */
        [data-theme="dark"] .status-internet,
        .app-dark .status-internet {
          background: rgba(239,68,68,0.15);
          color: #f87171;
          border: 1px solid rgba(239,68,68,0.35);
        }
        [data-theme="dark"] .status-internet:hover,
        .app-dark .status-internet:hover {
          filter: drop-shadow(0 0 7px #f87171);
        }
        [data-theme="dark"] .status-backend,
        .app-dark .status-backend {
          background: rgba(245,158,11,0.15);
          color: #fbbf24;
          border: 1px solid rgba(245,158,11,0.35);
        }
        [data-theme="dark"] .status-backend:hover,
        .app-dark .status-backend:hover {
          filter: drop-shadow(0 0 7px #fbbf24);
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        {!isOnline && (
          <div className="status-blink status-internet" title="Internet Offline">
            <WifiOff size={16} />
          </div>
        )}

        {!isBackendConnected && (
          <div className="status-blink status-backend" title="Backend Offline">
            <ServerOff size={16} />
          </div>
        )}

      </div>
    </>
  );
}