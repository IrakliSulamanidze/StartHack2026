import { Link } from 'react-router-dom';

export default function PartyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-white">Party Mode</h1>
        <p className="text-arena-text-dim mt-2">
          Compete live in a shared room. Perfect for classes, workshops, and group challenges.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Host */}
        <Link
          to="/party/host"
          className="bg-arena-surface border border-arena-border rounded-xl p-8 hover:border-arena-accent/40 transition-all group"
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-arena-accent/20 to-arena-accent/5 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-arena-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Host a Room</h2>
          <p className="text-sm text-arena-text-dim mb-4 leading-relaxed">
            Create a party room, set the investor profile and timing, then share the room code with your players.
          </p>
          <span className="text-sm font-semibold text-arena-accent group-hover:underline">Create Room →</span>
        </Link>

        {/* Join */}
        <Link
          to="/party/join"
          className="bg-arena-surface border border-arena-border rounded-xl p-8 hover:border-purple-400/40 transition-all group"
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-400/20 to-purple-400/5 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Join a Room</h2>
          <p className="text-sm text-arena-text-dim mb-4 leading-relaxed">
            Enter the room code given by your host. You'll compete against other players in real-time.
          </p>
          <span className="text-sm font-semibold text-purple-400 group-hover:underline">Join Room →</span>
        </Link>
      </div>

      {/* Info */}
      <div className="mt-10 bg-arena-surface border border-arena-border rounded-xl p-6">
        <h3 className="font-bold text-white mb-3">How Party Mode Works</h3>
        <div className="grid sm:grid-cols-4 gap-4 text-sm text-arena-text-dim">
          <div>
            <span className="text-arena-accent font-bold">1.</span> Host creates a room and chooses the investor profile and timing preset.
          </div>
          <div>
            <span className="text-arena-accent font-bold">2.</span> Students join using a 6-character room code.
          </div>
          <div>
            <span className="text-arena-accent font-bold">3.</span> Everyone plays the same 10-round scenario simultaneously with a timer.
          </div>
          <div>
            <span className="text-arena-accent font-bold">4.</span> Live rankings update after each round. Final results show top performers.
          </div>
        </div>
      </div>
    </div>
  );
}
