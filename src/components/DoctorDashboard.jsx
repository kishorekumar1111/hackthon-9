import { useApp } from '../AppContext';

function statusLabel(status) {
  if (status === 'active') return 'Active';
  if (status === 'requested') return 'Waiting for patient';
  return 'Ready';
}

export function DoctorDashboard() {
  const { state, logout, selectDoctorRequest, doctorJoin } = useApp();
  const { user, requests, selectedRequestId } = state;
  const list = requests.filter((r) => r.status !== 'ended');
  const selected = selectedRequestId ? requests.find((r) => r.id === selectedRequestId) : null;

  return (
    <section className="view view--dashboard" aria-label="Doctor dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="greeting">Dr. {user?.name ?? '—'}</h1>
          <span className="badge badge--waiting">Waiting for patient consent</span>
        </div>
        <button type="button" className="btn btn--ghost btn--small" onClick={logout}>
          Sign out
        </button>
      </header>

      <main className="dashboard-main">
        <div className="card card--interactive">
          <h2 className="card-title">Consultation requests</h2>
          <div className="request-list">
            {list.length === 0 ? (
              <p className="empty-state">No requests yet.</p>
            ) : (
              list.map((r) => (
                <div
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  className={`request-card ${selectedRequestId === r.id ? 'request-card--selected' : ''}`}
                  onClick={() => selectDoctorRequest(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectDoctorRequest(r.id);
                    }
                  }}
                >
                  <div className="request-name">{r.patientName}</div>
                  <p className="request-meta">{r.reason} · {statusLabel(r.status)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {selected && (
          <div className="card card--action card--interactive">
            <h2 className="card-title card-title--small">Selected request</h2>
            <p className="card-note">
              {selected.patientName} — {selected.reason} ·{' '}
              {selected.status === 'active' ? 'Active — You can join' : 'Waiting for patient to start'}
            </p>
            <button
              type="button"
              className="btn btn--primary btn--large"
              disabled={selected.status !== 'active'}
              onClick={doctorJoin}
            >
              Join Care Room
            </button>
            <p className="card-note card-note--warning">All data disappears after session ends.</p>
          </div>
        )}

        <div className="card card--info card--interactive">
          <p className="card-note">
            <strong>View-only access.</strong> You have access only when the patient allows and only during the active session.
          </p>
        </div>
      </main>
    </section>
  );
}
