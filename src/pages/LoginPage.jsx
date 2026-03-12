import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth as authApi } from '../api/client';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, acceptJwt } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('patient'); // 'patient' | 'doctor'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleRoleNeeded, setGoogleRoleNeeded] = useState(false);
  const [pendingGoogleIdToken, setPendingGoogleIdToken] = useState(null);

  const getErrorMessage = (err) => {
    // No response = backend unreachable (not running or wrong port)
    if (!err.response) {
      const isNetwork = err.code === 'ERR_NETWORK' || err.message?.includes('Network');
      return isNetwork
        ? 'Cannot reach the server. Start the backend: in the "backend" folder run: uvicorn main:app --reload --port 8000'
        : 'Something went wrong. Check your connection.';
    }
    const detail = err.response?.data?.detail;
    if (!detail) {
      const status = err.response?.status;
      if (status === 502 || status === 503 || status === 504) {
        return 'Server unavailable. Make sure the backend is running on port 8000.';
      }
      return 'Something went wrong. Check your connection.';
    }
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      const msg = first.msg || first.message;
      const loc = first.loc ? first.loc.filter(Boolean).join(' ') : '';
      return loc ? `${msg} (${loc})` : msg;
    }
    return 'Something went wrong';
  };

  const DEMO_PATIENT = { email: 'patient@test.com', password: 'demo123', role: 'patient' };
  const DEMO_DOCTOR = { email: 'doctor@test.com', password: 'demo123', role: 'doctor' };

  const handleDemoLogin = async (demo) => {
    setError('');
    setLoading(true);
    try {
      await authApi.seedDemo().catch(() => {});
      const data = await login(demo.email, demo.password);
      if (data?.role) {
        navigate(data.role === 'doctor' ? '/doctor/dashboard' : '/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoOffline = (role) => {
    const user = role === 'doctor'
      ? { id: 0, email: 'doctor@test.com', full_name: 'Dr. Demo', role: 'doctor' }
      : { id: 0, email: 'patient@test.com', full_name: 'Demo Patient', role: 'patient' };
    localStorage.setItem('ecr_token', `mock_${role}`);
    localStorage.setItem('ecr_user', JSON.stringify(user));
    window.location.href = role === 'doctor' ? '/doctor/dashboard' : '/dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let data;
      if (mode === 'register') {
        data = await register(email, password, fullName, role);
      } else {
        data = await login(email, password);
      }
      if (data?.role) {
        navigate(data.role === 'doctor' ? '/doctor/dashboard' : '/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const finishGoogleLogin = async (idToken, chosenRole) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.google({ id_token: idToken, role: chosenRole });
      const data = res.data;
      await acceptJwt(data.access_token);
      navigate(data.role === 'doctor' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail === 'role_required') {
        setGoogleRoleNeeded(true);
        setPendingGoogleIdToken(idToken);
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-stone-800 text-center mb-1">Ephemeral Care Room</h1>
        <p className="text-stone-500 text-center text-sm mb-8">
          Your consultation is private. No medical data is stored.
        </p>

        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8">
          {/* Role: Patient first */}
          <div className="flex rounded-xl bg-stone-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${role === 'patient' ? 'bg-white text-teal-700 shadow' : 'text-stone-600'}`}
            >
              I am a Patient
            </button>
            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${role === 'doctor' ? 'bg-white text-teal-700 shadow' : 'text-stone-600'}`}
            >
              I am a Doctor
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="space-y-2">
                <p className="text-red-600 text-sm">{error}</p>
                {(error.includes('server') || error.includes('connection') || error.includes('Cannot reach')) && (
                  <>
                    <p className="text-stone-500 text-xs">
                      Run backend: <code className="bg-stone-100 px-1 rounded">npm run backend</code>
                    </p>
                    <p className="text-stone-600 text-xs font-medium">Or try without backend (demo only):</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDemoOffline('patient')}
                        className="flex-1 py-2 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200"
                      >
                        Open as demo patient
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoOffline('doctor')}
                        className="flex-1 py-2 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200"
                      >
                        Open as demo doctor
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6">
            <p className="text-xs text-stone-500 mb-2">Or continue with Google</p>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(cred) => {
                  const idTok = cred?.credential;
                  if (!idTok) {
                    setError('Google login failed. Please try again.');
                    return;
                  }
                  // If user exists, backend will ignore role; if new user, we’ll ask for role.
                  finishGoogleLogin(idTok, role);
                }}
                onError={() => setError('Google login failed. Please try again.')}
                useOneTap={false}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="w-full mt-4 text-sm text-stone-500 hover:text-teal-600"
          >
            {mode === 'login' ? 'Create an account' : 'Already have an account? Sign in'}
          </button>

          <div className="mt-6 pt-6 border-t border-stone-200">
            <p className="text-xs text-stone-500 mb-2">Quick demo (requires backend running)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin(DEMO_PATIENT)}
                disabled={loading}
                className="flex-1 py-2 rounded-lg border border-teal-300 bg-teal-50 text-teal-700 text-sm font-medium hover:bg-teal-100 disabled:opacity-50"
              >
                Login as demo patient
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin(DEMO_DOCTOR)}
                disabled={loading}
                className="flex-1 py-2 rounded-lg border border-stone-300 bg-stone-50 text-stone-700 text-sm font-medium hover:bg-stone-100 disabled:opacity-50"
              >
                Login as demo doctor
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-1">patient@test.com / doctor@test.com — password: demo123</p>
          </div>

          {googleRoleNeeded && pendingGoogleIdToken && (
            <div className="mt-6 pt-6 border-t border-stone-200">
              <p className="text-sm font-medium text-stone-700 mb-2">Choose your role for this app</p>
              <p className="text-xs text-stone-500 mb-3">Patients are the primary users. You can change accounts anytime by signing out.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => finishGoogleLogin(pendingGoogleIdToken, 'patient')}
                  className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                >
                  Patient
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => finishGoogleLogin(pendingGoogleIdToken, 'doctor')}
                  className="flex-1 py-2 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
                >
                  Doctor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
