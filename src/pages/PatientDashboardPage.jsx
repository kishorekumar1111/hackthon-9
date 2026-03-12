import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appointments as appointmentsApi } from '../api/client';
import { sessions as sessionsApi } from '../api/client';

export default function PatientDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const message = location.state?.message;

  useEffect(() => {
    (async () => {
      try {
        const { data } = await appointmentsApi.my();
        setList(data);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleStartConsultation = async (appointmentId) => {
    try {
      await sessionsApi.start(appointmentId);
      navigate(`/care-room/${appointmentId}`);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to start');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await appointmentsApi.cancel(id);
      setList((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to cancel');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Hello, {user?.full_name}</h1>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-700 text-sm font-medium">You are private</span>
            <p className="text-stone-500 text-sm mt-1">No data is stored outside consultations.</p>
          </div>
          <button onClick={logout} className="text-stone-500 hover:text-stone-700 text-sm">Sign out</button>
        </div>

        {message && <div className="mb-4 p-3 rounded-lg bg-teal-50 text-teal-800 text-sm">{message}</div>}

        <div className="mb-6">
          <Link
            to="/doctors"
            className="block w-full py-4 rounded-xl border-2 border-teal-500 bg-teal-50 text-teal-700 font-semibold text-center hover:bg-teal-100 transition"
          >
            Find a doctor & book consultation
          </Link>
        </div>

        <h2 className="text-lg font-semibold text-stone-800 mb-3">Your appointments</h2>
        {loading && <p className="text-stone-500">Loading…</p>}
        {!loading && list.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-500">
            No appointments yet. Book a consultation above.
          </div>
        )}
        {!loading && list.length > 0 && (
          <ul className="space-y-3">
            {list.map((apt) => (
              <li key={apt.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="font-medium text-stone-800">{apt.doctor_name}</div>
                <div className="text-sm text-stone-500">{apt.appointment_date} · {apt.slot_start} – {apt.slot_end}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(apt.status === 'scheduled' || apt.status === 'live') && (
                    <button
                      onClick={() => handleStartConsultation(apt.id)}
                      className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
                    >
                      {apt.status === 'live' ? 'Enter care room' : 'Start consultation'}
                    </button>
                  )}
                  {apt.status === 'scheduled' && (
                    <button
                      onClick={() => handleCancel(apt.id)}
                      className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                  )}
                  {apt.status === 'completed' && <span className="text-stone-400 text-sm">Completed</span>}
                  {apt.status === 'cancelled' && <span className="text-stone-400 text-sm">Cancelled</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
