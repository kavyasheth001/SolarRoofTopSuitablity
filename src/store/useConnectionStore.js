import { create } from "zustand";

export const useConnectionStore = create((set) => ({
  isOnline: navigator.onLine,
  isBackendConnected: false,
  backendLatency: null,

  setOnlineStatus: (status) =>
    set({
      isOnline: status,
    }),

  setBackendStatus: (status, latency = null) =>
    set({
      isBackendConnected: status,
      backendLatency: latency,
    }),
}));