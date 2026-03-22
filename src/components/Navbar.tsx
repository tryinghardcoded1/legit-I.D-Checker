import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { ShieldCheck, LogOut, User, History, ShieldAlert, UserX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, userProfile, isAdmin, isPremium, isImpersonating, stopImpersonating } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (isImpersonating) {
      stopImpersonating();
    } else {
      await signOut(auth);
      navigate('/login');
    }
  };

  return (
    <>
      {isImpersonating && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm font-bold flex justify-between items-center z-50 relative">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4" />
            <span>You are currently impersonating user: {user?.email}</span>
          </div>
          <button 
            onClick={stopImpersonating}
            className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded transition-colors"
          >
            <UserX className="w-4 h-4" />
            <span>Stop Impersonating</span>
          </button>
        </div>
      )}
      <nav className="bg-emerald-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
                <span className="font-bold text-xl tracking-tight">Legit ID Checker PH</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {userProfile && (
                    <div className="flex items-center space-x-2">
                      {isPremium && !isAdmin && (
                        <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          PREMIUM
                        </span>
                      )}
                      <div className="flex items-center space-x-1 bg-emerald-800 px-3 py-1 rounded-full text-sm font-medium border border-emerald-700">
                        <span className="text-emerald-200">Credits:</span>
                        <span className="text-white font-bold">{userProfile.credits}</span>
                      </div>
                    </div>
                  )}
                  <Link to="/history" className="flex items-center space-x-1 hover:text-emerald-300 transition text-sm font-medium">
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">History</span>
                  </Link>
                  {isAdmin && !isImpersonating && (
                    <Link to="/admin" className="flex items-center space-x-1 hover:text-emerald-300 transition text-sm font-medium">
                      <ShieldAlert className="w-4 h-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 hover:text-red-300 transition text-sm font-medium ml-4"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center space-x-1 bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded-lg transition text-sm font-medium"
                >
                  <User className="w-4 h-4" />
                  <span>Login / Register</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
