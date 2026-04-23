import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import { Loader2 } from 'lucide-react';
import { SilkBackground } from './components/SilkBackground';
import { cn } from './lib/utils';

// Pages
import LandingPage from './pages/LandingPage';
import Onboarding from './pages/Onboarding';
import Assessment from './pages/Assessment';
import Subjects from './pages/Subjects';
import Dashboard from './pages/Dashboard';
import StudyPlan from './pages/StudyPlan';
import FocusMode from './pages/FocusMode';
import Quiz from './pages/Quiz';
import Analytics from './pages/Analytics';
import Heatmap from './pages/Heatmap';
import Graph from './pages/Graph';
import CrisisMode from './pages/CrisisMode';
import ProfessorMode from './pages/ProfessorMode';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import Syllabus from './pages/Syllabus';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const location = useLocation();

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!state.user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If no subject is selected, and we're not on the subjects page
  if (!state.selectedSubjectId && location.pathname !== '/subjects') {
    return <Navigate to="/subjects" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { state } = useApp();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-transparent text-foreground selection:bg-primary/30 relative overflow-hidden transition-colors duration-500">
      <div className="fixed inset-0 z-0">
        <SilkBackground />
      </div>
      <Navbar />
      <main className={cn("relative z-10", location.pathname !== '/focus' && location.pathname !== '/auth' && "pt-16")}>
        <Routes>
          {/* Root now redirects to Auth if not logged in, or Dashboard if logged in */}
          <Route 
            path="/" 
            element={state.user ? (state.selectedSubjectId ? <Navigate to="/dashboard" replace /> : <Navigate to="/subjects" replace />) : <Navigate to="/auth" replace />} 
          />
          
          <Route 
            path="/auth" 
            element={state.user ? (state.selectedSubjectId ? <Navigate to="/dashboard" replace /> : <Navigate to="/subjects" replace />) : <Auth />} 
          />
          
          {/* Landing page is still accessible at /welcome if needed */}
          <Route path="/welcome" element={<LandingPage />} />
          
          {/* Protected Routes */}
          <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/plan" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
          <Route path="/syllabus" element={<ProtectedRoute><Syllabus /></ProtectedRoute>} />
          <Route path="/focus" element={<ProtectedRoute><FocusMode /></ProtectedRoute>} />
          <Route path="/focus/:topicId" element={<ProtectedRoute><FocusMode /></ProtectedRoute>} />
          <Route path="/quiz/:topicId" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/heatmap" element={<ProtectedRoute><Heatmap /></ProtectedRoute>} />
          <Route path="/graph" element={<ProtectedRoute><Graph /></ProtectedRoute>} />
          <Route path="/crisis" element={<ProtectedRoute><CrisisMode /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* Public or semi-public */}
          <Route path="/professor" element={<ProfessorMode />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}
