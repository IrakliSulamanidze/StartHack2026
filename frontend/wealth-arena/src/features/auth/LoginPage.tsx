import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <div className="min-h-screen bg-arena-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3 mb-2">
            <img src="/logo.png" alt="Endgame Securities" className="h-32 w-auto" />
            <span className="text-2xl font-bold text-white">Endgame Securities</span>
          </Link>
          <p className="text-arena-text-dim">Welcome back, investor</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-arena-surface border border-arena-border rounded-xl p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-arena-text-dim mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-arena-bg border border-arena-border rounded-lg px-4 py-2.5 text-white placeholder-arena-text-dim focus:outline-none focus:border-arena-accent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-arena-text-dim mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-arena-bg border border-arena-border rounded-lg px-4 py-2.5 text-white placeholder-arena-text-dim focus:outline-none focus:border-arena-accent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-arena-danger">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-arena-accent text-black font-bold py-2.5 rounded-lg hover:bg-arena-accent/90 transition-colors"
          >
            Log In
          </button>

          <p className="text-center text-sm text-arena-text-dim">
            Don't have an account?{' '}
            <Link to="/signup" className="text-arena-accent hover:underline">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
