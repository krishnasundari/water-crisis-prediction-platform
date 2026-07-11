export const getBaseURL = () => {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000/api/v1"
    : "https://water-crisis-prediction-platform-1.onrender.com/api/v1";
};

export const getWebSocketURL = () => {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "ws://localhost:8000/api/v1/ws"
    : "wss://water-crisis-prediction-platform-1.onrender.com/api/v1/ws";
};
