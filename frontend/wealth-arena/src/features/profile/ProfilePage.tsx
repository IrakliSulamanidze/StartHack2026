import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateProfile({ name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-8">
      <h1 className="text-3xl font-black text-white mb-2">Profile</h1>
      <p className="text-arena-text-dim mb-8">Manage your account settings</p>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-arena-accent/20 flex items-center justify-center text-3xl font-bold text-arena-accent">
          {user?.name?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="text-lg font-bold text-white">{user?.name}</p>
          <p className="text-sm text-arena-text-dim">{user?.email}</p>
          <p className="text-xs text-arena-text-dim mt-1">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-arena-surface border border-arena-border rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-arena-text-dim mb-1">Display Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-arena-bg border border-arena-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arena-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-arena-text-dim mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-arena-bg border border-arena-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arena-accent"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-arena-accent text-black font-bold px-6 py-2.5 rounded-lg hover:bg-arena-accent/90 transition-colors"
          >
            Save Changes
          </button>
          {saved && <span className="text-sm text-arena-accent">✓ Saved</span>}
        </div>
      </form>

      {/* Stats Summary */}
      <div className="mt-8 bg-arena-surface border border-arena-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Performance Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Total Games" value="0" />
          <Stat label="Best Score" value="—" />
          <Stat label="Daily Streak" value="0" />
          <Stat label="Favorite Profile" value="—" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-arena-bg rounded-lg p-3">
      <p className="text-xs text-arena-text-dim font-medium">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
