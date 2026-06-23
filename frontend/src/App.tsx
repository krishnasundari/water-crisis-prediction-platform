import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './styles/App.css'
import ReservoirsPage from "./pages/ReservoirsPage";
import AlertsPage from "./pages/AlertsPage";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import VillagesPage from './pages/VillagesPage'
import PredictionsPage from './pages/PredictionsPage'
import MapsPage from './pages/MapsPage'
import ReportsPage from './pages/ReportsPage'
import AIAssistantPage from './pages/AIAssistantPage'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage signup />} />
          
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
  path="/ai-assistant"
  element={
    <ProtectedRoute>
      <AIAssistantPage />
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

