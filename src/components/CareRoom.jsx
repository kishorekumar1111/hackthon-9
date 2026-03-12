import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { formatDuration } from '../store';

export function CareRoom() {
  const { state, endConsultation, uploadReport } = useApp();
  const [showEndModal, setShowEndModal] = useState(false);
  const req = state.activeRequestId
    ? state.requests.find((r) => r.id === state.activeRequestId)
    : null;
  const isPatient = state.user?.type === 'patient';
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!req?.startedAt) return;
    const tick = () => setElapsed(Date.now() - req.startedAt);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [req?.id, req?.startedAt]);

  if (!req || req.status !== 'active') {
    return null; // App will redirect
  }

  const handleEndClick = () => setShowEndModal(true);
  const handleCancelEnd = () => setShowEndModal(false);
  const handleConfirmEnd = () => {
    setShowEndModal(false);
    endConsultation();
  };

  return (
    <section className="view view--care-room" aria-label="Care room">
      <header className="care-room-header">
        <div className="care-room-header-left">
          <span className="badge badge--live" aria-live="polite">
            <span className="dot" /> Consultation Active
          </span>
          <span className="session-timer">{formatDuration(elapsed)}</span>
        </div>
        {isPatient && (
          <button type="button" className="btn btn--danger btn--small" onClick={handleEndClick}>
            End Consultation
          </button>
        )}
      </header>

      <main className="care-room-main">
        <div className="video-area video-area--live">
          <div className="video-placeholder">
            <p>Video is live and encrypted</p>
            <p className="video-note">No video or audio is recorded.</p>
          </div>
        </div>

        <div className="care-room-messages">
          <p>Video is live and encrypted.</p>
          <p>No video or audio is recorded.</p>
          <p>Files are deleted after session.</p>
        </div>

        <div className="care-room-actions">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={!isPatient}
            onClick={uploadReport}
          >
            Upload Medical Report
          </button>
          {req.filesCount > 0 && (
            <p className="card-note">
              Files shared: {req.filesCount} (deleted after session)
            </p>
          )}
          <p className="card-note">Upload is available during active consultation only.</p>
        </div>
      </main>

      {showEndModal && (
        <div className="modal">
          <div className="modal-backdrop" aria-hidden="true" onClick={handleCancelEnd} />
          <div className="modal-content">
            <h2 className="modal-title">End consultation?</h2>
            <p className="modal-text">
              The session will end and all shared files will be deleted.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn--ghost" onClick={handleCancelEnd}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" onClick={handleConfirmEnd}>
                End consultation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
