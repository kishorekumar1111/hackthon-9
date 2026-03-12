import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';

function SessionTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(Date.now() - (startedAt || Date.now()));
  useEffect(() => {
    const tick = () => setElapsed(Date.now() - (startedAt || Date.now()));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const totalSeconds = Math.floor(elapsed / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return <span className="session-timer">{m + ':' + (s < 10 ? '0' : '') + s}</span>;
}

function getPatientRequest(requests, userName) {
  return requests.find((r) => r.patientName === userName && r.status !== 'ended') ?? null;
}

function getLastEndedRequest(requests, userName) {
  const ended = requests.filter((r) => r.patientName === userName && r.status === 'ended');
  return ended.length ? ended[ended.length - 1] : null;
}

export function PatientDashboard() {
  const { state, logout, bookConsultation, enterCareRoom, toggleDoctorAccess, endConsultation } = useApp();
  const { user, requests, bookLoading, noDoctor } = state;
  const req = getPatientRequest(requests, user?.name);
  const lastEnded = getLastEndedRequest(requests, user?.name);
  const hasSession = !!req;
  const isActive = req?.status === 'active';
  const [showEndModal, setShowEndModal] = useState(false);

  return (
    <section className="view view--dashboard" aria-label="Patient dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="greeting">Hello, {user?.name ?? '—'}</h1>
          <span className="badge badge--private">You are private</span>
        </div>
        <p className="header-note">No data is stored outside consultations.</p>
        <button type="button" className="btn btn--ghost btn--small" onClick={logout}>
          Sign out
        </button>
      </header>

      <main className="dashboard-main">
        {!hasSession && (
          <div className="card card--primary card--interactive">
            <h2 className="card-title">Book Private Consultation</h2>
            <p className="card-subtext">Start a secure, temporary care session.</p>
            <button
              type="button"
              className="btn btn--primary btn--large"
              onClick={bookConsultation}
              disabled={bookLoading}
            >
              Book Private Consultation
            </button>
            {bookLoading && (
              <div className="loading-inline">
                <span className="spinner" aria-hidden="true" />
                <span>Booking…</span>
              </div>
            )}
            {noDoctor && (
              <p className="message message--warning">
                No doctor is available right now. Please try again shortly.
              </p>
            )}
            {lastEnded && (
              <p className="message message--warning">
                Your last consultation has ended. You can book a new one.
              </p>
            )}
          </div>
        )}

        {hasSession && (
          <div className="card card--session card--interactive">
            <div className="session-status-row">
              <span className={`badge ${isActive ? 'badge--active' : ''}`}>
                {isActive ? 'Consultation Active' : 'Consultation Ready'}
              </span>
              {isActive && req?.startedAt && (
                <SessionTimer startedAt={req.startedAt} />
              )}
            </div>
            <p className="card-subtext">
              {isActive
                ? 'You are in the care room. You can end the consultation when done.'
                : 'Your consultation is ready. Enter when you are.'}
            </p>
            <div className="session-actions">
              <button type="button" className="btn btn--primary" onClick={enterCareRoom}>
                Enter Care Room
              </button>
              <button
                type="button"
                className="btn btn--danger btn--secondary"
                disabled={!isActive}
                onClick={() => setShowEndModal(true)}
              >
                End Consultation
              </button>
            </div>
            {showEndModal && (
              <div className="modal">
                <div className="modal-backdrop" aria-hidden="true" onClick={() => setShowEndModal(false)} />
                <div className="modal-content">
                  <h2 className="modal-title">End consultation?</h2>
                  <p className="modal-text">The session will end and all shared files will be deleted.</p>
                  <div className="modal-actions">
                    <button type="button" className="btn btn--ghost" onClick={() => setShowEndModal(false)}>Cancel</button>
                    <button type="button" className="btn btn--danger" onClick={() => { setShowEndModal(false); endConsultation(); }}>End consultation</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="card card--consent card--interactive">
          <h2 className="card-title card-title--small">Doctor access</h2>
          <div className="consent-row">
            <span className="consent-value">{req?.doctorAccess ? 'ON' : 'OFF'}</span>
            <button
              type="button"
              className="toggle"
              aria-pressed={req?.doctorAccess ?? false}
              disabled={!hasSession}
              onClick={toggleDoctorAccess}
            >
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </button>
          </div>
          <p className="card-note">Doctor can see you only while access is ON.</p>
        </div>

        <div className="card card--files card--interactive">
          <h2 className="card-title card-title--small">File sharing</h2>
          <p className="card-note">
            {req?.filesCount
              ? `Files shared (${req.filesCount}) — will be deleted after session.`
              : 'No files shared.'}
          </p>
        </div>
      </main>
    </section>
  );
}
