import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const villageIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const reservoirIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
function FitBounds({
  villages,
  reservoirs,
}: {
  villages: any[];
  reservoirs: any[];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];

    villages.forEach((v) => {
      points.push([v.latitude, v.longitude]);
    });

    reservoirs.forEach((r) => {
     if (
  r.latitude != null &&
  r.longitude != null &&
  !(r.latitude === 0 && r.longitude === 0)
) {
  points.push([r.latitude, r.longitude]);
}
    });

    if (points.length > 0) {
      map.fitBounds(points, {
        padding: [40, 40],
      });
    }
  }, [villages, reservoirs, map]);

  return null;
}

export default function MapsPage() {
  const [villages, setVillages] = useState<any[]>([]);
  const [reservoirs, setReservoirs] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/villages")
      .then((res) => res.json())
      .then(setVillages)
      .catch(console.error);

    fetch("http://127.0.0.1:8000/api/v1/reservoirs")
      .then((res) => res.json())
      .then(setReservoirs)
      .catch(console.error);
  }, []);

  const totalLocations = useMemo(() => {
    return villages.length + reservoirs.length;
  }, [villages, reservoirs]);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          padding: "30px",
          background: "#f5f7fa",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ marginBottom: "25px" }}>
          🌍 Water Crisis Monitoring Map
        </h1>

        {/* Statistics */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "20px",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,.08)",
            }}
          >
            <h3>🏘 Villages</h3>

            <h1>{villages.length}</h1>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,.08)",
            }}
          >
            <h3>💧 Reservoirs</h3>

            <h1>{reservoirs.length}</h1>
          </div>

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,.08)",
            }}
          >
            <h3>📍 Total Locations</h3>

            <h1>{totalLocations}</h1>
          </div>
        </div>

        {/* Legend */}

        <div
          style={{
            display: "flex",
            gap: "25px",
            background: "white",
            padding: "15px 20px",
            borderRadius: "10px",
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,.08)",
          }}
        >
          <div>
            🟢 <strong>Village</strong>
          </div>

          <div>
            🔵 <strong>Reservoir</strong>
          </div>
        </div>

        {/* Map */}

        <div
          style={{
            background: "white",
            padding: "15px",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,.1)",
          }}
        >
          <MapContainer
            center={[22.5, 79]}
            zoom={5}
            style={{
              height: "650px",
              width: "100%",
              borderRadius: "12px",
            }}
          >
            <TileLayer
              attribution="© OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds
  villages={villages}
  reservoirs={reservoirs}
/>
                        {/* Village Markers */}

            {villages.map((v) => (
              <Marker
                key={`v-${v.id}`}
                position={[v.latitude, v.longitude]}
                icon={villageIcon}
              >
                <Popup>
                  <div style={{ minWidth: "220px" }}>
                    <h3 style={{ margin: "0 0 10px 0", color: "#15803d" }}>
                      🏘 {v.name}
                    </h3>

                    <hr />

                    <p><b>District:</b> {v.district}</p>

                    <p><b>State:</b> {v.state}</p>

                    <p><b>Population:</b> {v.population}</p>

                    <p><b>Water Source:</b> {v.water_source}</p>

                    <p>
                      <b>Reservoir Dependency:</b>{" "}
                      {v.reservoir_dependency}%
                    </p>

                    <p>
                      <b>Latitude:</b> {v.latitude}
                    </p>

                    <p>
                      <b>Longitude:</b> {v.longitude}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Reservoir Markers */}

            {reservoirs
             .filter(
  (r) =>
    r.latitude !== null &&
    r.longitude !== null &&
    !(r.latitude === 0 && r.longitude === 0)
)
              .map((r) => (
                <Marker
                  key={`r-${r.id}`}
                  position={[r.latitude, r.longitude]}
                  icon={reservoirIcon}
                >
                  <Popup>
                    <div style={{ minWidth: "220px" }}>
                      <h3
                        style={{
                          margin: "0 0 10px 0",
                          color: "#2563eb",
                        }}
                      >
                        💧 {r.name}
                      </h3>

                      <hr />

                      <p>
                        <b>District:</b> {r.district}
                      </p>

                      <p>
                        <b>State:</b> {r.state}
                      </p>

                      <p>
                        <b>Capacity:</b> {r.capacity}
                      </p>

                      <p>
                        <b>Current Level:</b>{" "}
                        {r.current_level}
                      </p>

                      <p>
                        <b>Latitude:</b> {r.latitude}
                      </p>

                      <p>
                        <b>Longitude:</b> {r.longitude}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}