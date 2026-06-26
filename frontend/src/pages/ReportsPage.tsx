import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  const [newReport, setNewReport] = useState({
    title: "",
    type: "PDF",
    created_at: new Date().toISOString().split("T")[0],
  });

  const loadReports = () => {
    fetch("http://127.0.0.1:8000/api/v1/reports/")
      .then((res) => res.json())
      .then((data) => setReports(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadReports();
  }, []);

  const generateReport = async () => {
    await fetch("http://127.0.0.1:8000/api/v1/reports/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newReport),
    });

    setNewReport({
      title: "",
      type: "PDF",
      created_at: new Date().toISOString().split("T")[0],
    });

    loadReports();
  };

  const deleteReport = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/v1/reports/${id}`, {
      method: "DELETE",
    });

    loadReports();
  };

  const downloadReport = (id: number) => {
    window.open(
      `http://127.0.0.1:8000/api/v1/reports/${id}/download`,
      "_blank"
    );
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
        <h1>📄 Reports Management</h1>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            marginTop: "20px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h2>Generate Report</h2>

          <input
            placeholder="Report Title"
            value={newReport.title}
            onChange={(e) =>
              setNewReport({
                ...newReport,
                title: e.target.value,
              })
            }
            style={{
              padding: "8px",
              width: "250px",
              marginRight: "10px",
            }}
          />

          <select
            value={newReport.type}
            onChange={(e) =>
              setNewReport({
                ...newReport,
                type: e.target.value,
              })
            }
            style={{
              padding: "8px",
              marginRight: "10px",
            }}
          >
            <option>PDF</option>
            <option>CSV</option>
          </select>

          <button
            onClick={generateReport}
            style={{
              padding: "8px 16px",
              background: "#1976d2",
              color: "white",
              border: "none",
              cursor: "pointer",
              borderRadius: "5px",
            }}
          >
            Generate Report
          </button>
        </div>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            marginTop: "30px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h2>Report History</h2>

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
                <th style={{ padding: "10px" }}>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Date</th>
                <th>Download</th>
                <th>Delete</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  style={{
                    textAlign: "center",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  <td>{report.id}</td>
                  <td>{report.title}</td>
                  <td>{report.type}</td>
                  <td>{report.created_at}</td>

                  <td>
                    <button
                      onClick={() => downloadReport(report.id)}
                      style={{
                        background: "#43a047",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        cursor: "pointer",
                        borderRadius: "5px",
                      }}
                    >
                      Download
                    </button>
                  </td>

                  <td>
                    <button
                      onClick={() => deleteReport(report.id)}
                      style={{
                        background: "#e53935",
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