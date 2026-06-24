import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function ReservoirsPage() {
  const [reservoirs, setReservoirs] = useState<any[]>([]);

  const [newReservoir, setNewReservoir] = useState({
    name: "",
    capacity: "",
    current_level: "",
    district: "",
    state: "",
  });

  const fetchReservoirs = () => {
    fetch("http://127.0.0.1:8000/api/v1/reservoirs/")
      .then((res) => res.json())
      .then((data) => setReservoirs(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchReservoirs();
  }, []);

  const addReservoir = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/reservoirs/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newReservoir.name,
            capacity: Number(newReservoir.capacity),
            current_level: Number(newReservoir.current_level),
            district: newReservoir.district,
            state: newReservoir.state,
            latitude: 0,
            longitude: 0,
          }),
        }
      );

      if (!response.ok) {
        alert("Failed to add reservoir");
        return;
      }

      fetchReservoirs();

      setNewReservoir({
        name: "",
        capacity: "",
        current_level: "",
        district: "",
        state: "",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteReservoir = async (id: number) => {
    try {
      await fetch(
        `http://127.0.0.1:8000/api/v1/reservoirs/${id}`,
        {
          method: "DELETE",
        }
      );

      fetchReservoirs();
    } catch (error) {
      console.error(error);
    }
  };

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

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            marginTop: "20px",
            marginBottom: "20px",
          }}
        >
          <h2>Add Reservoir</h2>

          <input
            placeholder="Name"
            value={newReservoir.name}
            onChange={(e) =>
              setNewReservoir({
                ...newReservoir,
                name: e.target.value,
              })
            }
          />

          <input
            placeholder="Capacity"
            value={newReservoir.capacity}
            onChange={(e) =>
              setNewReservoir({
                ...newReservoir,
                capacity: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <input
            placeholder="Current Level"
            value={newReservoir.current_level}
            onChange={(e) =>
              setNewReservoir({
                ...newReservoir,
                current_level: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <input
            placeholder="District"
            value={newReservoir.district}
            onChange={(e) =>
              setNewReservoir({
                ...newReservoir,
                district: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <input
            placeholder="State"
            value={newReservoir.state}
            onChange={(e) =>
              setNewReservoir({
                ...newReservoir,
                state: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <button
            onClick={addReservoir}
            style={{
              marginLeft: "10px",
              padding: "8px 15px",
              background: "#1565c0",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Add Reservoir
          </button>
        </div>

        <table
          style={{
            width: "100%",
            background: "white",
            borderCollapse: "collapse",
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
              <th>Action</th>
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
                <td>
                  <button
                    onClick={() => deleteReservoir(r.id)}
                    style={{
                      background: "red",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}