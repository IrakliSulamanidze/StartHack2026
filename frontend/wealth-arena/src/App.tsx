import { GameProvider, useGame } from './context/GameContext';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import TradingPage from './pages/TradingPage';
import NewsPage from './pages/NewsPage';
import SettingsPage from './pages/SettingsPage';
import GamePage from './pages/GamePage';

function AppContent() {
  const { state } = useGame();

  let page: React.ReactNode;
  switch (state.page) {
    case 'home':     page = <HomePage />;    break;
    case 'game':     page = <GamePage />;    break;
    case 'trading':  page = <TradingPage />; break;
    case 'news':     page = <NewsPage />;    break;
    case 'settings': page = <SettingsPage />; break;
  }

  return (
    <div className="flex min-h-screen bg-arena-bg text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {page}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
