import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:8000/api/v1";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
  const filteredReports = reports.filter((report) =>
  report.title.toLowerCase().includes(searchTerm.toLowerCase())
);
const totalReports = reports.length;

const pdfReports = reports.filter(
  (r) => r.report_type === "pdf"
).length;

const excelReports = reports.filter(
  (r) => r.report_type === "excel"
).length;

const latestReport =
  reports.length > 0
    ? new Date(reports[0].created_at).toLocaleDateString()
    : "N/A";

  const generateReport = async () => {
    try {
      let filtersObject = {};
      setGenerating(true);

      if (newReport.filters.trim() !== "") {
        try {
          filtersObject = JSON.parse(newReport.filters);
          setGenerating(true);
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

      await loadReports();
      alert("✅ Report generated successfully!");
      setGenerating(false);
    } catch (err) {
      console.error(err);
      alert("Failed to generate report.");
      setGenerating(false);
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
    disabled={generating}
            style={{
              padding: "10px 20px",
              background: "#1565c0",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: generating ? "not-allowed" : "pointer",
opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? "Generating..." : "Generate Report"}
          </button>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        ><div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: "20px",
    marginBottom: "25px",
  }}
>
  <div
    style={{
      background: "#e3f2fd",
      padding: "18px",
      borderRadius: "10px",
    }}
  >
    <h3>📄 Total Reports</h3>
    <h1>{totalReports}</h1>
  </div>

  <div
    style={{
      background: "#e8f5e9",
      padding: "18px",
      borderRadius: "10px",
    }}
  >
    <h3>📥 PDF Reports</h3>
    <h1>{pdfReports}</h1>
  </div>

  <div
    style={{
      background: "#fff8e1",
      padding: "18px",
      borderRadius: "10px",
    }}
  >
    <h3>📊 Excel Reports</h3>
    <h1>{excelReports}</h1>
  </div>

  <div
    style={{
      background: "#f3e5f5",
      padding: "18px",
      borderRadius: "10px",
    }}
  >
    <h3>🕒 Latest Report</h3>
    <h1 style={{ fontSize: "18px" }}>{latestReport}</h1>
  </div>
</div>
          <h2 style={{ marginTop: 0 }}>Generated Reports</h2>
          <input
  type="text"
  placeholder="🔍 Search reports..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  style={{
    width: "100%",
    padding: "10px",
    marginBottom: "20px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  }}
/>

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
              {filteredReports.length === 0 ? (
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
                filteredReports.map((report) => (
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