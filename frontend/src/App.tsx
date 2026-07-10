import SignupPage from "./pages/SignupPage";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './styles/App.css'
import ReservoirsPage from "./pages/ReservoirsPage";
import AlertsPage from "./pages/AlertsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AnalyticsPage from "./pages/AnalyticsPage";

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import VillagesPage from './pages/VillagesPage'
import PredictionsPage from './pages/PredictionsPage'
import MapsPage from './pages/MapsPage'
import ReportsPage from './pages/ReportsPage'
import AIAssistantPage from './pages/AIAssistantPage'
import SearchPage from './pages/SearchPage'
import DisasterPage from "./pages/DisasterPage";
import WeatherPage from "./pages/WeatherPage";
import RainfallPage from "./pages/RainfallPage";
import DamPage from "./pages/DamPage";

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Main Routes */}
          <Route
  path="/"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/villages"
  element={
    <ProtectedRoute>
      <VillagesPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/reservoirs"
  element={
    <ProtectedRoute>
      <ReservoirsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/predictions"
  element={
    <ProtectedRoute>
      <PredictionsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/maps"
  element={
    <ProtectedRoute>
      <MapsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/reports"
  element={
    <ProtectedRoute>
      <ReportsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/analytics"
  element={
    <ProtectedRoute>
      <AnalyticsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/ai-assistant"
  element={
    <ProtectedRoute>
      <AIAssistantPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/search"
  element={
    <ProtectedRoute>
      <SearchPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/disaster-monitoring"
  element={
    <ProtectedRoute>
      <DisasterPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/weather-monitoring"
  element={
    <ProtectedRoute>
      <WeatherPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/rainfall-monitoring"
  element={
    <ProtectedRoute>
      <RainfallPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/dam-monitoring"
  element={
    <ProtectedRoute>
      <DamPage />
    </ProtectedRoute>
  }
/>
          <Route path="/alerts" element={<AlertsPage />} />
          {/* 404 Route */}
          <Route path="*" element={
            <div className="error-page">
              <h1>404 - Page Not Found</h1>
              <p>The page you're looking for doesn't exist.</p>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App

