import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);

  const [newAlert, setNewAlert] = useState({
    village: "",
    severity: "Low",
    message: "",
  });

  const loadAlerts = () => {
    fetch("http://127.0.0.1:8000/api/v1/alerts/")
      .then((res) => res.json())
      .then((data) => setAlerts(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const createAlert = async () => {
    await fetch("http://127.0.0.1:8000/api/v1/alerts/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newAlert),
    });

    setNewAlert({
      village: "",
      severity: "Low",
      message: "",
    });

    loadAlerts();
  };

  const markAsRead = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/v1/alerts/${id}/read`, {
      method: "PUT",
    });

    loadAlerts();
  };

  const deleteAlert = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/v1/alerts/${id}`, {
      method: "DELETE",
    });

    loadAlerts();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "#d32f2f";
      case "Medium":
        return "#f9a825";
      case "Low":
        return "#43a047";
      default:
        return "#1976d2";
    }
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          padding: "30px",
          background: "#f4f6f9",
          minHeight: "100vh",
        }}
      >
        <h1>🚨 Alerts Management</h1>

        {/* Create Alert */}

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            marginTop: "20px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h2>Create Alert</h2>

          <input
            placeholder="Village"
            value={newAlert.village}
            onChange={(e) =>
              setNewAlert({
                ...newAlert,
                village: e.target.value,
              })
            }
            style={{ padding: "8px", marginRight: "10px" }}
          />

          <select
            value={newAlert.severity}
            onChange={(e) =>
              setNewAlert({
                ...newAlert,
                severity: e.target.value,
              })
            }
            style={{ padding: "8px", marginRight: "10px" }}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>Critical</option>
          </select>

          <input
            placeholder="Alert Message"
            value={newAlert.message}
            onChange={(e) =>
              setNewAlert({
                ...newAlert,
                message: e.target.value,
              })
            }
            style={{
              padding: "8px",
              width: "300px",
              marginRight: "10px",
            }}
          />

          <button
            onClick={createAlert}
            style={{
              background: "#1976d2",
              color: "white",
              border: "none",
              padding: "8px 16px",
              cursor: "pointer",
              borderRadius: "5px",
            }}
          >
            Create Alert
          </button>
        </div>

        {/* Alerts Table */}

        <div
          style={{
            background: "white",
            marginTop: "30px",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h2>Current Alerts</h2>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "20px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#1976d2",
                  color: "white",
                }}
              >
                <th>ID</th>
                <th>Village</th>
                <th>Severity</th>
                <th>Message</th>
                <th>Status</th>
                <th>Read</th>
                <th>Delete</th>
              </tr>
            </thead>

            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.id}
                  style={{
                    textAlign: "center",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  <td>{alert.id}</td>

                  <td>{alert.village}</td>

                  <td
                    style={{
                      color: getSeverityColor(alert.severity),
                      fontWeight: "bold",
                    }}
                  >
                    {alert.severity}
                  </td>

                  <td>{alert.message}</td>

                  <td>{alert.status}</td>

                  <td>
                    <button
                      onClick={() => markAsRead(alert.id)}
                      style={{
                        background: "#43a047",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        cursor: "pointer",
                        borderRadius: "5px",
                      }}
                    >
                      Read
                    </button>
                  </td>

                  <td>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      style={{
                        background: "#d32f2f",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        cursor: "pointer",
                        borderRadius: "5px",
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
    </div>
  );
}