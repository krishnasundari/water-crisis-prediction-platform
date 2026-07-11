import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000/api/v1"
    : "https://water-crisis-prediction-platform-1.onrender.com/api/v1";

// ============================
// Marker Icons
// ============================

const safeVillageIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const moderateVillageIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const highVillageIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const reservoirIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const refugeIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ============================
// Interfaces
// ============================

interface Village {
  id: number;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  population: number;
  water_source: string;
  reservoir_dependency: number;
}

interface Reservoir {
  id: number;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_level: number;
}

interface Prediction {
  id: number;
  village_id: number;
  risk_level: string;
}

// ============================
// Auto Zoom Component
// ============================

function FitBounds({
  villages,
  reservoirs,
}: {
  villages: Village[];
  reservoirs: Reservoir[];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];

    villages.forEach((v) => {
      points.push([v.latitude, v.longitude]);
    });

    reservoirs.forEach((r) => {
      if (
        r.latitude !== 0 &&
        r.longitude !== 0
      ) {
        points.push([r.latitude, r.longitude]);
      }
    });

    if (points.length) {
      map.fitBounds(points, {
        padding: [50, 50],
      });
    }
  }, [villages, reservoirs, map]);

  return null;
}
function UserLocation({
  position,
}: {
  position: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 12);
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <Marker position={position}>
      <Popup>
        📍 You are here
      </Popup>
    </Marker>
  );
}

// ============================
// Main Component
// ============================

export default function MapsPage() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [reservoirs, setReservoirs] = useState<Reservoir[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [userLocation, setUserLocation] =
  useState<[number, number] | null>(null);
  const [search, setSearch] = useState("");
const [districtFilter, setDistrictFilter] = useState("All");
const [riskFilter, setRiskFilter] = useState("All");

  const handleCalculateRoute = async (villageId: number) => {
    setRouteLoading(true);
    try {
      const res = await fetch(`${API}/evacuation/route?village_id=${villageId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveRoute(data);
      } else {
        console.error("Failed to fetch evacuation route");
      }
    } catch (err) {
      console.error("Evacuation routing error:", err);
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    fetch(`${API}/villages`)
      .then((res) => res.json())
      .then(setVillages)
      .catch(console.error);

    fetch(`${API}/reservoirs`)
      .then((res) => res.json())
      .then(setReservoirs)
      .catch(console.error);

    fetch(`${API}/predictions`)
      .then((res) => res.json())
      .then(setPredictions)
      .catch(console.error);

    fetch(`${API}/alerts`)
      .then((res) => res.json())
      .then(setAlerts)
      .catch(console.error);
  }, []);  const totalLocations = useMemo(() => {
    return villages.length + reservoirs.length;
  }, [villages, reservoirs]);
  const riskLookup = useMemo(() => {
  const lookup = new Map<number, string>();

  predictions.forEach((prediction) => {
    lookup.set(
      prediction.village_id,
      prediction.risk_level.toLowerCase()
    );
  });

  return lookup;
}, [predictions]);

const districts = useMemo(() => {
  return [
    "All",
    ...new Set(villages.map((v) => v.district)),
  ];
}, [villages]);

const filteredVillages = useMemo(() => {
  return villages.filter((village) => {
    const searchMatch = village.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const districtMatch =
      districtFilter === "All" ||
      village.district === districtFilter;

    const risk =
      riskLookup.get(village.id) ?? "safe";

    const riskMatch =
      riskFilter === "All" ||
      risk === riskFilter.toLowerCase();

    return (
      searchMatch &&
      districtMatch &&
      riskMatch
    );
  });
}, [
  villages,
  search,
  districtFilter,
  riskFilter,
  riskLookup,
]);


  

  const getVillageIcon = (villageId: number) => {
    const risk = riskLookup.get(villageId);

    switch (risk) {
      case "high":
        return highVillageIcon;

      case "moderate":
        return moderateVillageIcon;

      default:
        return safeVillageIcon;
    }
  };

  const getRiskColor = (villageId: number) => {
    const risk = riskLookup.get(villageId);

    switch (risk) {
      case "high":
        return "#dc2626";

      case "moderate":
        return "#f59e0b";

      default:
        return "#16a34a";
    }
  };
  const locateMe = () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setUserLocation([
        position.coords.latitude,
        position.coords.longitude,
      ]);
    },
    () => {
      alert("Unable to fetch your location.");
    }
  );
};

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f5f7fa",
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          padding: "30px",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            marginBottom: "24px",
          }}
        >
          🌍 Water Crisis Monitoring Map
        </h1>
        <div
  style={{
    marginBottom: "20px",
  }}
>
  <button
    onClick={locateMe}
    style={{
      background: "#1976d2",
      color: "white",
      border: "none",
      padding: "10px 18px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    📍 Locate Me
  </button>
</div>

        {/* Statistics */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,.08)",
            }}
          >
            <h3>🏘 Villages</h3>
            <h1>{filteredVillages.length}</h1>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,.08)",
            }}
          >
            <h3>💧 Reservoirs</h3>
            <h1>{reservoirs.length}</h1>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,.08)",
            }}
          >
            <h3>📍 Total Locations</h3>
            <h1>{totalLocations}</h1>
          </div>
        </div>
        <div
  style={{
    display: "flex",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap",
  }}
>
  <input
    type="text"
    placeholder="Search village..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      width: "220px",
    }}
  />

  <select
    value={districtFilter}
    onChange={(e) =>
      setDistrictFilter(e.target.value)
    }
    style={{
      padding: "10px",
      borderRadius: "8px",
    }}
  >
    {districts.map((district) => (
      <option
        key={district}
        value={district}
      >
        {district}
      </option>
    ))}
  </select>

  <select
    value={riskFilter}
    onChange={(e) =>
      setRiskFilter(e.target.value)
    }
    style={{
      padding: "10px",
      borderRadius: "8px",
    }}
  >
    <option>All</option>
    <option>Safe</option>
    <option>Moderate</option>
    <option>High</option>
  </select>
</div>
        

        {/* Legend */}

        <div
          style={{
            display: "flex",
            gap: "24px",
            background: "#fff",
            padding: "16px 20px",
            borderRadius: "12px",
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,.08)",
          }}
        >
          <div>🟢 <strong>Safe</strong></div>
          <div>🟡 <strong>Moderate</strong></div>
          <div>🔴 <strong>High Risk</strong></div>
          <div>🔵 <strong>Reservoir</strong></div>
        </div>

        {/* Map */}

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "15px",
            boxShadow: "0 2px 10px rgba(0,0,0,.1)",
            position: "relative"
          }}
        >
          <MapContainer
            center={[22.5, 79]}
            zoom={5}
            style={{
              width: "100%",
              height: "650px",
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
            <UserLocation position={userLocation} />

            {/* Evacuation Route Drawing */}
            {activeRoute && (
              <>
                <Polyline
                  positions={activeRoute.route_coordinates}
                  pathOptions={{
                    color: "#10b981",
                    weight: 6,
                    opacity: 0.8,
                    dashArray: activeRoute.routing_mode === "fallback_direct" ? "10, 10" : undefined
                  }}
                />
                <Marker
                  position={[activeRoute.refuge.latitude, activeRoute.refuge.longitude]}
                  icon={refugeIcon}
                >
                  <Popup>
                    <div style={{ minWidth: "150px" }}>
                      <h4 style={{ color: "#b45309", margin: "0 0 5px 0" }}>🔰 Designated Safe Refuge</h4>
                      <p style={{ margin: "2px 0", fontSize: "11px" }}><strong>Name:</strong> {activeRoute.refuge.name}</p>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* Active Alert Warning Halos */}
            {alerts
              .filter((a: any) => !a.is_read && a.village_id)
              .map((alert: any) => {
                const village = villages.find((v: any) => v.id === alert.village_id);
                if (!village) return null;
                return (
                  <Circle
                    key={`alert-halo-${alert.id}`}
                    center={[village.latitude, village.longitude]}
                    pathOptions={{
                      color: alert.severity === "critical" ? "#ef4444" : "#f97316",
                      fillColor: alert.severity === "critical" ? "#ef4444" : "#f97316",
                      fillOpacity: 0.15,
                      weight: 1.5,
                      dashArray: "5, 5"
                    }}
                    radius={18000}
                  />
                );
              })}

            {/* Village Markers */}

            {filteredVillages.map((village) => (
              <Marker
                key={village.id}
                position={[
                  village.latitude,
                  village.longitude,
                ]}
                icon={getVillageIcon(village.id)}
              >
                <Popup>
                  <div style={{ minWidth: "220px" }}>
                    <h3
                      style={{
                        color: getRiskColor(village.id),
                        marginBottom: "10px",
                      }}
                    >
                      🏘 {village.name}
                    </h3>

                    <hr />                    <p>
                      <strong>District:</strong> {village.district}
                    </p>

                    <p>
                      <strong>State:</strong> {village.state}
                    </p>

                    <p>
                      <strong>Population:</strong> {village.population}
                    </p>

                    <p>
                      <strong>Water Source:</strong> {village.water_source}
                    </p>

                    <p>
                      <strong>Reservoir Dependency:</strong>{" "}
                      {village.reservoir_dependency}%
                    </p>

                    <p>
                      <strong>Risk Level:</strong>{" "}
                      <span
                        style={{
                          color: getRiskColor(village.id),
                          fontWeight: "bold",
                        }}
                      >
                        {(
                          riskLookup.get(village.id) ?? "safe"
                        ).toUpperCase()}
                      </span>
                    </p>

                    <p>
                      <strong>Latitude:</strong> {village.latitude}
                    </p>

                    <p>
                      <strong>Longitude:</strong> {village.longitude}
                    </p>
                    
                    <button
                      onClick={() => handleCalculateRoute(village.id)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        marginTop: "12px",
                        fontSize: "11px"
                      }}
                    >
                      {routeLoading ? "Calculating..." : "🏃 Evacuate Route"}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Reservoir Markers */}

            {reservoirs.map((reservoir) => (
              <Marker
                key={reservoir.id}
                position={[
                  reservoir.latitude,
                  reservoir.longitude,
                ]}
                icon={reservoirIcon}
              >
                <Popup>
                  <div style={{ minWidth: "220px" }}>
                    <h3
                      style={{
                        color: "#2563eb",
                        marginBottom: "10px",
                      }}
                    >
                      💧 {reservoir.name}
                    </h3>

                    <hr />

                    <p>
                      <strong>District:</strong>{" "}
                      {reservoir.district}
                    </p>

                    <p>
                      <strong>State:</strong>{" "}
                      {reservoir.state}
                    </p>

                    <p>
                      <strong>Capacity:</strong>{" "}
                      {reservoir.capacity}
                    </p>

                    <p>
                      <strong>Current Level:</strong>{" "}
                      {reservoir.current_level}
                    </p>

                    <p>
                      <strong>Latitude:</strong>{" "}
                      {reservoir.latitude}
                    </p>

                    <p>
                      <strong>Longitude:</strong>{" "}
                      {reservoir.longitude}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

          </MapContainer>
          
          {/* Evacuation Route Floating Info Card */}
          {activeRoute && (
            <div style={{
              position: "absolute",
              top: "30px",
              right: "30px",
              zIndex: 1000,
              background: "rgba(15, 23, 42, 0.95)",
              color: "white",
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid rgba(51, 65, 85, 0.8)",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
              width: "280px",
              backdropFilter: "blur(8px)",
              fontSize: "12px"
            }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#10b981", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                🏃 Evacuation Routing Solver
              </h4>
              <hr style={{ border: "0", borderTop: "1px solid #334155", margin: "10px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <p style={{ margin: 0 }}><strong>Start:</strong> <span style={{ textTransform: "capitalize" }}>{activeRoute.source.name}</span></p>
                <p style={{ margin: 0 }}><strong>Refuge:</strong> <span style={{ textTransform: "capitalize", color: "#fbbf24", fontWeight: "bold" }}>{activeRoute.refuge.name}</span></p>
                <p style={{ margin: 0 }}><strong>Distance:</strong> {activeRoute.distance_km} km</p>
                <p style={{ margin: 0 }}><strong>Driving Time:</strong> {activeRoute.duration_minutes} mins</p>
                <p style={{ margin: 0 }}><strong>Method:</strong> <span style={{ textTransform: "uppercase", fontWeight: "bold", fontSize: "10px", color: activeRoute.routing_mode === "osrm_streets" ? "#10b981" : "#f59e0b" }}>{activeRoute.routing_mode === "osrm_streets" ? "OSRM Real Road Network" : "Direct Geodesic Line"}</span></p>
              </div>
              <button
                onClick={() => setActiveRoute(null)}
                style={{
                  width: "100%",
                  marginTop: "16px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "background 0.2s"
                }}
              >
                Clear Evacuation Route
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
  