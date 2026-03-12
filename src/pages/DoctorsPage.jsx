import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doctors as doctorsApi } from '../api/client';

export default function DoctorsPage() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await doctorsApi.list({ search: search || undefined, specialty: specialty || undefined });
        if (!cancelled) setList(data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.detail || 'Failed to load doctors');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [search, specialty]);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Find a doctor</h1>
        <p className="text-stone-500 text-sm mb-6">Book a private consultation. No data is stored after your session.</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="text"
            placeholder="Specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {loading && <p className="text-stone-500">Loading…</p>}
        {!loading && list.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-500">
            No doctors found. Try different search.
          </div>
        )}
        {!loading && list.length > 0 && (
          <ul className="space-y-3">
            {list.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/doctors/${d.id}`}
                  className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-teal-400 hover:shadow-md transition"
                >
                  <div className="font-semibold text-stone-800">{d.full_name}</div>
                  <div className="text-sm text-stone-500">{d.specialty} · {d.experience_years} years</div>
                  <span className="inline-block mt-2 text-teal-600 text-sm font-medium">Book appointment →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
