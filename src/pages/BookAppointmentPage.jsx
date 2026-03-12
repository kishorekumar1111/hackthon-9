import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctors as doctorsApi } from '../api/client';
import { appointments as appointmentsApi } from '../api/client';

export default function BookAppointmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await doctorsApi.get(id);
        if (!cancelled) setDoctor(data);
      } catch (e) {
        if (!cancelled) setError('Doctor not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!date || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await doctorsApi.slots(id, date);
        if (!cancelled) setSlots(data);
      } catch {
        if (!cancelled) setSlots([]);
      }
    })();
    return () => { cancelled = true; };
  }, [id, date]);

  const minDate = new Date().toISOString().slice(0, 10);

  const handleBook = async () => {
    if (!selectedSlot || !date) return;
    setError('');
    setBooking(true);
    try {
      await appointmentsApi.create({
        doctor_id: parseInt(id, 10),
        appointment_date: date,
        slot_start: selectedSlot.start,
        slot_end: selectedSlot.end,
      });
      navigate('/dashboard', { state: { message: 'Appointment booked successfully' } });
    } catch (e) {
      setError(e.response?.data?.detail || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="p-8 text-stone-500">Loading…</div>;
  if (error && !doctor) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-xl font-bold text-stone-800 mb-1">Book with {doctor?.full_name}</h1>
        <p className="text-stone-500 text-sm mb-6">{doctor?.specialty}</p>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Date</label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {date && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Time slot</label>
              {slots.length === 0 && <p className="text-stone-500 text-sm">Loading slots…</p>}
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                      selectedSlot?.start === slot.start
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'border-stone-300 text-stone-700 hover:border-teal-400'
                    }`}
                  >
                    {slot.start} – {slot.end}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            onClick={handleBook}
            disabled={!selectedSlot || booking}
            className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {booking ? 'Booking…' : 'Confirm booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
