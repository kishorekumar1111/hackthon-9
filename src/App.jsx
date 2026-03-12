import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DoctorsPage from './pages/DoctorsPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import PatientDashboardPage from './pages/PatientDashboardPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import CareRoomPage from './pages/CareRoomPage';

function Protected({ children, requirePatient }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requirePatient && user.role !== 'patient') return <Navigate to="/doctor/dashboard" replace />;
  if (requirePatient === false && user.role !== 'doctor') return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/doctors"
          element={
            <Protected>
              <DoctorsPage />
            </Protected>
          }
        />
        <Route
          path="/doctors/:id"
          element={
            <Protected>
              <DoctorProfilePage />
            </Protected>
          }
        />
        <Route
          path="/doctors/:id/book"
          element={
            <Protected requirePatient>
              <BookAppointmentPage />
            </Protected>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Protected requirePatient>
              <PatientDashboardPage />
            </Protected>
          }
        />
        <Route
          path="/doctor/dashboard"
          element={
            <Protected requirePatient={false}>
              <DoctorDashboardPage />
            </Protected>
          }
        />
        <Route
          path="/care-room/:appointmentId"
          element={
            <Protected>
              <CareRoomPage />
            </Protected>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
