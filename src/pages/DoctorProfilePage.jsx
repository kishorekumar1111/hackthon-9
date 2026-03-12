import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctors as doctorsApi } from '../api/client';

export default function DoctorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await doctorsApi.get(id);
        if (!cancelled) setDoctor(data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.detail || 'Doctor not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="p-8 text-stone-500">Loading…</div>;
  if (error || !doctor) return <div className="p-8 text-red-600">{error || 'Not found'}</div>;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <h1 className="text-xl font-bold text-stone-800">{doctor.full_name}</h1>
            <p className="text-teal-600 font-medium">{doctor.specialty}</p>
            <p className="text-sm text-stone-500 mt-1">{doctor.experience_years} years experience</p>
            {doctor.bio && <p className="mt-3 text-stone-600 text-sm">{doctor.bio}</p>}
          </div>
          <div className="p-6">
            <button
              onClick={() => navigate(`/doctors/${id}/book`)}
              className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
            >
              Book appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
