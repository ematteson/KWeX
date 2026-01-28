import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TeamDashboard } from './pages/TeamDashboard'
import { SurveyPage } from './pages/SurveyPage'
import { SurveyComplete } from './pages/SurveyComplete'
import { TeamsPage } from './pages/TeamsPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'
import { ExecutiveDashboard } from './pages/ExecutiveDashboard'
import { OccupationDetailPage } from './pages/OccupationDetailPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public survey route - no layout wrapper */}
        <Route path="/survey/:token" element={<SurveyPage />} />
        <Route path="/survey/complete" element={<SurveyComplete />} />

        {/* Dashboard routes with layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/executive" replace />} />
          <Route path="executive" element={<ExecutiveDashboard />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="teams/:teamId" element={<TeamDashboard />} />
          <Route path="teams/:teamId/opportunities" element={<OpportunitiesPage />} />
          <Route path="occupations/:occupationId" element={<OccupationDetailPage />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
