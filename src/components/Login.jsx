import { useState } from 'react';
import { useApp } from '../AppContext';

export function Login() {
  const { login } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handlePatientClick = () => {
    setShowForm(true);
    setIsDoctor(false);
    setName('');
    setError('');
  };

  const handleDoctorClick = () => {
    setShowForm(true);
    setIsDoctor(true);
    setName('');
    setError('');
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }
    setError('');
    login(isDoctor ? 'doctor' : 'patient', trimmed);
  };

  return (
    <section className="view view--login" aria-label="Sign in">
      <div className="login-card">
        <h1 className="app-title">Ephemeral Care Room</h1>
        <p className="login-subtitle">Privacy-first healthcare. No data stored outside consultations.</p>
        <div className="login-choices">
          <button type="button" className="btn btn--primary btn--block" onClick={handlePatientClick}>
            I am a Patient
          </button>
          <button type="button" className="btn btn--secondary btn--block" onClick={handleDoctorClick}>
            I am a Doctor
          </button>
        </div>
        {showForm && (
          <div className="login-form">
            <label htmlFor="input-name" className="label">Your name</label>
            <input
              type="text"
              id="input-name"
              className="input"
              placeholder={isDoctor ? 'Doctor name' : 'Enter your name'}
              autoComplete="name"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            {error && (
              <p className="message message--error" role="alert">{error}</p>
            )}
            <button type="button" className="btn btn--primary btn--block" onClick={handleSubmit}>
              Continue
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
