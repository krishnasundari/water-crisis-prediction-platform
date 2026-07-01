import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:8000/api/v1";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  const [newReport, setNewReport] = useState({
    report_type: "pdf",
    include_predictions: true,
    include_forecasts: true,
    filters: "",
  });

  const loadReports = () => {
    fetch(`${API_BASE}/reports`)
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setReports(data);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadReports();
  }, []);

  const generateReport = async () => {
    try {
      let filtersObject = {};

      if (newReport.filters.trim() !== "") {
        try {
          filtersObject = JSON.parse(newReport.filters);
        } catch {
          alert("Filters must be valid JSON.");
          return;
        }
      }

      await fetch(`${API_BASE}/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_type: newReport.report_type,
          include_predictions: newReport.include_predictions,
          include_forecasts: newReport.include_forecasts,
          filters: filtersObject,
        }),
      });

      setNewReport({
        report_type: "pdf",
        include_predictions: true,
        include_forecasts: true,
        filters: "",
      });

      loadReports();
    } catch (err) {
      console.error(err);
      alert("Failed to generate report.");
    }
  };

  const downloadReport = (id: number) => {
    window.open(`${API_BASE}/reports/${id}/download`, "_blank");
  };

  const deleteReport = async (id: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this report?"
    );

    if (!confirmDelete) return;

    await fetch(`${API_BASE}/reports/${id}`, {
      method: "DELETE",
    });

    loadReports();
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
        <h1>📄 Reports</h1>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "25px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Generate New Report</h2>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ marginRight: "10px" }}>
              Report Type:
            </label>

            <select
              value={newReport.report_type}
              onChange={(e) =>
                setNewReport({
                  ...newReport,
                  report_type: e.target.value,
                })
              }
              style={{
                padding: "8px",
                width: "180px",
              }}
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
            </select>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>
              <input
                type="checkbox"
                checked={newReport.include_predictions}
                onChange={(e) =>
                  setNewReport({
                    ...newReport,
                    include_predictions: e.target.checked,
                  })
                }
              />

              <span style={{ marginLeft: "8px" }}>
                Include Predictions
              </span>
            </label>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>
              <input
                type="checkbox"
                checked={newReport.include_forecasts}
                onChange={(e) =>
                  setNewReport({
                    ...newReport,
                    include_forecasts: e.target.checked,
                  })
                }
              />

              <span style={{ marginLeft: "8px" }}>
                Include Forecasts
              </span>
            </label>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>
              Filters (JSON)
            </label>

            <textarea
              rows={5}
              placeholder='Example: {"district":"Patna"}'
              value={newReport.filters}
              onChange={(e) =>
                setNewReport({
                  ...newReport,
                  filters: e.target.value,
                })
              }
              style={{
                width: "100%",
                marginTop: "8px",
                padding: "10px",
                resize: "vertical",
              }}
            />
          </div>

          <button
            onClick={generateReport}
            style={{
              padding: "10px 20px",
              background: "#1565c0",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Generate Report
          </button>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Generated Reports</h2>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
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
                <th style={{ padding: "10px" }}>Title</th>
                <th style={{ padding: "10px" }}>Type</th>
                <th style={{ padding: "10px" }}>Created At</th>
                <th style={{ padding: "10px" }}>Download</th>
                <th style={{ padding: "10px" }}>Delete</th>
              </tr>
            </thead>

            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "30px",
                    }}
                  >
                    No reports generated yet.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    style={{
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    <td style={{ padding: "10px" }}>{report.id}</td>

                    <td style={{ padding: "10px" }}>
                      {report.title}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        textTransform: "uppercase",
                      }}
                    >
                      {report.report_type}
                    </td>

                    <td style={{ padding: "10px" }}>
                      {new Date(report.created_at).toLocaleString()}
                    </td>

                    <td style={{ padding: "10px" }}>
                      <button
                        onClick={() => downloadReport(report.id)}
                        style={{
                          background: "green",
                          color: "white",
                          border: "none",
                          padding: "8px 14px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Download
                      </button>
                    </td>

                    <td style={{ padding: "10px" }}>
                      <button
                        onClick={() => deleteReport(report.id)}
                        style={{
                          background: "red",
                          color: "white",
                          border: "none",
                          padding: "8px 14px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}