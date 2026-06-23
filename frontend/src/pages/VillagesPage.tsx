import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function VillagesPage() {
  const [villages, setVillages] = useState<any[]>([]);

  const [newVillage, setNewVillage] = useState({
    name: "",
    district: "",
    state: "",
    population: "",
  });

  const fetchVillages = () => {
    fetch("http://127.0.0.1:8000/api/v1/villages/")
      .then((res) => res.json())
      .then((data) => setVillages(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchVillages();
  }, []);

  const addVillage = async () => {
    try {
      await fetch("http://127.0.0.1:8000/api/v1/villages/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newVillage.name,
          district: newVillage.district,
          state: newVillage.state,
          population: Number(newVillage.population),
          latitude: 25.6,
          longitude: 85.1,
          water_source: "River",
          reservoir_dependency: 50,
        }),
      });

      setNewVillage({
        name: "",
        district: "",
        state: "",
        population: "",
      });

      fetchVillages();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteVillage = async (id: number) => {
    try {
      await fetch(
        `http://127.0.0.1:8000/api/v1/villages/${id}`,
        {
          method: "DELETE",
        }
      );

      fetchVillages();
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
        <h1>🏘️ Villages Management</h1>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h2>Add Village</h2>

          <input
            placeholder="Village Name"
            value={newVillage.name}
            onChange={(e) =>
              setNewVillage({
                ...newVillage,
                name: e.target.value,
              })
            }
          />

          <input
            placeholder="District"
            value={newVillage.district}
            onChange={(e) =>
              setNewVillage({
                ...newVillage,
                district: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <input
            placeholder="State"
            value={newVillage.state}
            onChange={(e) =>
              setNewVillage({
                ...newVillage,
                state: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <input
            placeholder="Population"
            value={newVillage.population}
            onChange={(e) =>
              setNewVillage({
                ...newVillage,
                population: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <button
            onClick={addVillage}
            style={{
              marginLeft: "10px",
              padding: "10px",
              background: "#1976d2",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Add Village
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
              <th>District</th>
              <th>State</th>
              <th>Population</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {villages.map((village) => (
              <tr key={village.id}>
                <td>{village.id}</td>
                <td>{village.name}</td>
                <td>{village.district}</td>
                <td>{village.state}</td>
                <td>{village.population}</td>

                <td>
                  <button
                    onClick={() =>
                      deleteVillage(village.id)
                    }
                    style={{
                      background: "red",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
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