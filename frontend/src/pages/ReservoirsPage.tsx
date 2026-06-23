import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function ReservoirsPage() {
  const [reservoirs, setReservoirs] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/reservoirs")
      .then((res) => res.json())
      .then((data) => setReservoirs(data))
      .catch((err) => console.error(err));
  }, []);

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
        <h1>💧 Reservoir Management</h1>

        <table
          style={{
            width: "100%",
            background: "white",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Capacity</th>
              <th>Current Level</th>
              <th>District</th>
              <th>State</th>
            </tr>
          </thead>

          <tbody>
            {reservoirs.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.capacity}</td>
                <td>{r.current_level}</td>
                <td>{r.district}</td>
                <td>{r.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}