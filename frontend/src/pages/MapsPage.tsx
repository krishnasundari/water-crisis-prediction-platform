import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapsPage() {
  const [villages, setVillages] = useState<any[]>([]);
  const [reservoirs, setReservoirs] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/villages")
      .then(r => r.json())
      .then(setVillages)
      .catch(console.error);

    fetch("http://127.0.0.1:8000/api/v1/reservoirs")
      .then(r => r.json())
      .then(setReservoirs)
      .catch(console.error);
  }, []);

  return (
    <div style={{display:"flex"}}>
      <Sidebar/>
      <div style={{flex:1,padding:20,background:"#f5f7fa",minHeight:"100vh"}}>
        <h1>🌍 Water Crisis Monitoring Map</h1>

        <div style={{
          marginTop:20,
          background:"white",
          borderRadius:12,
          padding:10,
          boxShadow:"0 2px 10px rgba(0,0,0,.1)"
        }}>
          <MapContainer
            center={[22.5,79]}
            zoom={5}
            style={{height:"650px",width:"100%",borderRadius:"12px"}}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {villages.map(v=>(
              <Marker
                key={"v"+v.id}
                position={[v.latitude,v.longitude]}
              >
                <Popup>
                  <b>🏘️ {v.name}</b><br/>
                  District: {v.district}<br/>
                  State: {v.state}<br/>
                  Population: {v.population}<br/>
                  Water Source: {v.water_source}<br/>
                  Reservoir Dependency: {v.reservoir_dependency}%
                </Popup>
              </Marker>
            ))}

            {reservoirs
              .filter((r:any)=>r.latitude!==null && r.longitude!==null)
              .map((r:any)=>(
              <Marker
                key={"r"+r.id}
                position={[r.latitude,r.longitude]}
              >
                <Popup>
                  <b>💧 {r.name}</b><br/>
                  State: {r.state}<br/>
                  Capacity: {r.capacity}<br/>
                  Current Level: {r.current_level}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
