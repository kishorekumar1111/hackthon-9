import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appointments as appointmentsApi } from '../api/client';

export default function DoctorDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await appointmentsApi.my();
        const today = new Date().toISOString().slice(0, 10);
        setList(data.filter((a) => a.appointment_date === today));
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleJoin = (appointmentId) => {
    navigate(`/care-room/${appointmentId}`);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Dr. {user?.full_name}</h1>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-600 text-sm font-medium">Today's appointments</span>
          </div>
          <button onClick={logout} className="text-stone-500 hover:text-stone-700 text-sm">Sign out</button>
        </div>

        <h2 className="text-lg font-semibold text-stone-800 mb-3">Consultations</h2>
        {loading && <p className="text-stone-500">Loading…</p>}
        {!loading && list.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-500">
            No appointments today.
          </div>
        )}
        {!loading && list.length > 0 && (
          <ul className="space-y-3">
            {list.map((apt) => (
              <li key={apt.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="font-medium text-stone-800">{apt.patient_name || 'Patient'}</div>
                <div className="text-sm text-stone-500">{apt.slot_start} – {apt.slot_end}</div>
                <div className="mt-2">
                  {apt.status === 'live' && (
                    <button
                      onClick={() => handleJoin(apt.id)}
                      className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
                    >
                      Join care room
                    </button>
                  )}
                  {apt.status === 'scheduled' && <span className="text-stone-400 text-sm">Waiting for patient to start</span>}
                  {apt.status === 'completed' && <span className="text-stone-400 text-sm">Completed</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
