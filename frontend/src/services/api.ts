const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

async function request(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json();
}

// Authentication
export const authAPI = {
  login: (data: any) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Dashboard
export const dashboardAPI = {
  stats: () => request("/dashboard/stats"),
};

// Villages
export const villageAPI = {
  getAll: () => request("/villages"),
};

// Reservoirs
export const reservoirAPI = {
  getAll: () => request("/reservoirs"),
};

// Predictions
export const predictionAPI = {
  getAll: () => request("/predictions"),

  create: (data: any) =>
    request("/predictions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Alerts
export const alertAPI = {
  getAll: () => request("/alerts"),
};

// Reports
export const reportAPI = {
  getAll: () => request("/reports"),

  generate: (data: any) =>
    request("/reports/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Analytics
export const analyticsAPI = {
  riskDistribution: () =>
    request("/analytics/risk-distribution"),

  reservoirUtilization: () =>
    request("/analytics/reservoir-utilization"),

  districtSummary: () =>
    request("/analytics/district-summary"),

  alertsSummary: () =>
    request("/analytics/alerts-summary"),

  monthlyPredictions: () =>
    request("/analytics/monthly-predictions"),
};

// AI Assistant
export const aiAPI = {
  chat: (message: string) =>
    request("/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
      }),
    }),

  history: () => request("/ai/history"),

  recommendations: () =>
    request("/ai/recommendations"),

  clearHistory: () =>
    request("/ai/history", {
      method: "DELETE",
    }),
};