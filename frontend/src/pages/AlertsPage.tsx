import Sidebar from "../components/Sidebar";

export default function AlertsPage() {
  const alerts = [
    {
      id: 1,
      village: "Pongodu",
      severity: "High",
      message: "Water shortage expected within 30 days",
    },
    {
      id: 2,
      village: "Nalanda Village",
      severity: "Moderate",
      message: "Groundwater level declining",
    },
    {
      id: 3,
      village: "Patna Village",
      severity: "Low",
      message: "Reservoir level below seasonal average",
    },
  ];

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
        <h1>🚨 Alerts Center</h1>

        <table
          style={{
            width: "100%",
            background: "white",
            borderCollapse: "collapse",
            marginTop: "20px",
            borderRadius: "10px",
          }}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Village</th>
              <th>Severity</th>
              <th>Message</th>
            </tr>
          </thead>

          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td>{alert.id}</td>
                <td>{alert.village}</td>
                <td>{alert.severity}</td>
                <td>{alert.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}