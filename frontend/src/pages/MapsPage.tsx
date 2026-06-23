import Sidebar from "../components/Sidebar";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapsPage() {
  const villages = [
    {
      id: 1,
      name: "Patna Village",
      lat: 25.5941,
      lng: 85.1376,
      risk: "Safe",
    },
    {
      id: 2,
      name: "Nalanda Village",
      lat: 25.1367,
      lng: 85.4437,
      risk: "Moderate",
    },
    {
      id: 3,
      name: "Pongodu",
      lat: 17.385,
      lng: 78.4867,
      risk: "High",
    },
  ];

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          padding: "20px",
          background: "#f5f7fa",
          minHeight: "100vh",
        }}
      >
        <h1>🌍 Water Crisis Monitoring Map</h1>

        <div
          style={{
            marginTop: "20px",
            background: "white",
            padding: "10px",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <MapContainer
            center={[23.5937, 80.9629]}
            zoom={5}
            style={{
              height: "600px",
              width: "100%",
              borderRadius: "12px",
            }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {villages.map((village) => (
              <Marker
                key={village.id}
                position={[village.lat, village.lng]}
              >
                <Popup>
                  <strong>{village.name}</strong>
                  <br />
                  Risk Level: {village.risk}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}