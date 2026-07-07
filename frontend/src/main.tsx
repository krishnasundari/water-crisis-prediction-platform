import "leaflet/dist/leaflet.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider
      clientId="477358386706-ru8cmef0bgtclpvfhqsrf1fq1ddbc76r.apps.googleusercontent.com"
    >
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);