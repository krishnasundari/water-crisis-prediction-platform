export const getBaseURL = () => {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000/api/v1"
    : import.meta.env.VITE_API_URL || (window.location.hostname.endsWith(".railway.app") ? "https://water-crisis-prediction-platform-production.up.railway.app/api/v1" : "https://water-crisis-prediction-platform-1.onrender.com/api/v1");
};

export const getWebSocketURL = () => {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "ws://localhost:8000/api/v1/ws"
    : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^http/, "ws") + "/ws" : (window.location.hostname.endsWith(".railway.app") ? "wss://water-crisis-prediction-platform-production.up.railway.app/api/v1/ws" : "wss://water-crisis-prediction-platform-1.onrender.com/api/v1/ws"));
};
