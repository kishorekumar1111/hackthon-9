import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { sessions as sessionsApi } from '../api/client';
import { files as filesApi } from '../api/client';

export default function CareRoomPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [consentUpdating, setConsentUpdating] = useState(false);
  const fileInputRef = useRef(null);
  const isPatient = user?.role === 'patient';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await sessionsApi.byAppointment(appointmentId);
        if (!cancelled) setSession(data);
      } catch {
        if (!cancelled) navigate(isPatient ? '/dashboard' : '/doctor/dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appointmentId, isPatient, navigate]);

  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const start = new Date(session.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.id, session?.started_at, session?.status]);

  useEffect(() => {
    if (!session || session.status !== 'active') return;
    let cancelled = false;
    const fetchFiles = async () => {
      try {
        const { data } = await filesApi.list(session.id);
        if (!cancelled) setFileList(data);
      } catch {
        if (!cancelled) setFileList([]);
      }
    };
    fetchFiles();
    const id = setInterval(fetchFiles, 5000);
    return () => { clearInterval(id); cancelled = true; };
  }, [session?.id, session?.status]);

  // Doctor: if patient revokes access, exit calmly
  useEffect(() => {
    if (!session) return;
    if (!isPatient && session.doctor_consent === false) {
      navigate('/doctor/dashboard', { state: { message: 'Patient revoked access. You have been returned to dashboard.' } });
    }
  }, [session, isPatient, navigate]);

  const handleEndSession = async () => {
    if (!confirm('End consultation? All shared files will be deleted.')) return;
    setEnding(true);
    try {
      await sessionsApi.end(session.id);
      navigate(isPatient ? '/dashboard' : '/doctor/dashboard', { state: { message: 'Consultation ended.' } });
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed');
    } finally {
      setEnding(false);
    }
  };

  const handleConsentToggle = async () => {
    if (!session) return;
    setConsentUpdating(true);
    try {
      const next = !session.doctor_consent;
      await sessionsApi.consent(session.id, next);
      const { data } = await sessionsApi.byAppointment(appointmentId);
      setSession(data);
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not update consent');
    } finally {
      setConsentUpdating(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploading(true);
    try {
      await filesApi.upload(session.id, file);
      const { data } = await filesApi.list(session.id);
      setFileList(data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleViewFile = async (fileId) => {
    try {
      const { data } = await client.get(`/files/session/${session.id}/file/${fileId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch {
      alert('Could not open file');
    }
  };

  if (loading) return <div className="p-8 text-stone-500">Loading…</div>;
  if (!session || session.status !== 'active') return null;

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const timer = `${m}:${s.toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-200">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Consultation active
            </span>
            <span className="font-mono text-stone-600">{timer}</span>
          </div>
          {isPatient && (
            <button
              onClick={handleEndSession}
              disabled={ending}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              End consultation
            </button>
          )}
        </div>

        <div className="bg-stone-800 rounded-xl aspect-video flex items-center justify-center text-white/90 mb-6">
          <div className="text-center p-8">
            <p className="text-lg font-medium">Video is live and encrypted</p>
            <p className="text-sm opacity-80 mt-1">No video or audio is recorded.</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-900">
          <p>Video is live and encrypted. No video or audio is recorded. Files will be deleted after session.</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-stone-800">Doctor access</h2>
              <p className="text-sm text-stone-500 mt-1">Doctor can see you only while access is ON.</p>
            </div>
            {isPatient ? (
              <button
                type="button"
                disabled={consentUpdating}
                onClick={handleConsentToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  session.doctor_consent
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                } disabled:opacity-50`}
              >
                {consentUpdating ? 'Updating…' : session.doctor_consent ? 'Access ON' : 'Access OFF'}
              </button>
            ) : (
              <div className="text-sm text-stone-600">
                Access: <span className="font-medium">{session.doctor_consent ? 'ON' : 'OFF'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-semibold text-stone-800 mb-3">Medical reports</h2>
          {isPatient && (
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Upload (PDF, JPG, PNG)'}
              </button>
            </div>
          )}
          {fileList.length === 0 && <p className="text-stone-500 text-sm">No files shared yet.</p>}
          <ul className="space-y-2">
            {fileList.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <span className="text-stone-700">{f.original_filename}</span>
                {!isPatient && (
                  <button
                    onClick={() => handleViewFile(f.id)}
                    className="text-teal-600 hover:underline"
                  >
                    View
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
