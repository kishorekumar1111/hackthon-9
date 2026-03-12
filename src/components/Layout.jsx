import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, isMockUser } = useAuth();
  const isPatient = user?.role === 'patient';

  return (
    <div>
      {isMockUser && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-900">
          Demo mode (no backend). Run <code className="bg-amber-200 px-1 rounded">npm run backend</code> for full features.
        </div>
      )}
      <nav className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={isPatient ? '/dashboard' : '/doctor/dashboard'} className="font-semibold text-stone-800">
            Ephemeral Care Room
          </Link>
          <div className="flex items-center gap-4">
            {isPatient && (
              <Link to="/doctors" className="text-sm text-stone-600 hover:text-teal-600">
                Find doctors
              </Link>
            )}
            <Link to={isPatient ? '/dashboard' : '/doctor/dashboard'} className="text-sm text-stone-600 hover:text-teal-600">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
