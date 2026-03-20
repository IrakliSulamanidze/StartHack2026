import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useState, useRef, useEffect } from 'react';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/daily', label: 'Daily Puzzle' },
  { to: '/sandbox/setup', label: 'Sandbox' },
  { to: '/markets', label: 'Markets' },
  { to: '/classroom', label: 'Classroom' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="bg-arena-surface border-b border-arena-border px-4 lg:px-8 h-14 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span className="text-xl">⚔️</span>
          <span className="hidden sm:inline">Last Portfolio Standing</span>
          <span className="sm:hidden">LPS</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => {
            const active = location.pathname.startsWith(link.to.split('/').slice(0, 2).join('/'));
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-arena-accent/15 text-arena-accent'
                    : 'text-arena-text-dim hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-arena-accent/20 flex items-center justify-center text-sm font-bold text-arena-accent">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <span className="hidden sm:inline text-sm text-arena-text-dim">{user?.name ?? 'User'}</span>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-arena-surface border border-arena-border rounded-lg shadow-xl py-1 z-50">
            <Link
              to="/profile"
              onClick={() => setDropdownOpen(false)}
              className="block px-4 py-2 text-sm text-arena-text hover:bg-white/5"
            >
              Profile
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setDropdownOpen(false)}
              className="block px-4 py-2 text-sm text-arena-text hover:bg-white/5 md:hidden"
            >
              Dashboard
            </Link>
            <hr className="border-arena-border my-1" />
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-arena-danger hover:bg-white/5"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
