import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '@/layouts/PublicLayout';
import AppLayout from '@/layouts/AppLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';

import LandingPage from '@/features/landing/LandingPage';
import LoginPage from '@/features/auth/LoginPage';
import SignupPage from '@/features/auth/SignupPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import DailyPage from '@/features/daily/DailyPage';
import DailyResultPage from '@/features/daily/DailyResultPage';
import SandboxSetupPage from '@/features/sandbox/SandboxSetupPage';
import SandboxPlayPage from '@/features/sandbox/SandboxPlayPage';
import SandboxResultPage from '@/features/sandbox/SandboxResultPage';
import PartyPage from '@/features/party/PartyPage';
import PartyHostPage from '@/features/party/PartyHostPage';
import PartyJoinPage from '@/features/party/PartyJoinPage';
import PartyLobbyPage from '@/features/party/PartyLobbyPage';
import PartyPlayPage from '@/features/party/PartyPlayPage';
import PartyResultPage from '@/features/party/PartyResultPage';
import ProfilePage from '@/features/profile/ProfilePage';
import MarketsPage from '@/features/markets/MarketsPage';
import AssetDetailPage from '@/features/markets/AssetDetailPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/daily" element={<DailyPage />} />
          <Route path="/daily/result" element={<DailyResultPage />} />
          <Route path="/sandbox/setup" element={<SandboxSetupPage />} />
          <Route path="/sandbox/play" element={<SandboxPlayPage />} />
          <Route path="/sandbox/result" element={<SandboxResultPage />} />
          <Route path="/party" element={<PartyPage />} />
          <Route path="/party/host" element={<PartyHostPage />} />
          <Route path="/party/join" element={<PartyJoinPage />} />
          <Route path="/party/lobby" element={<PartyLobbyPage />} />
          <Route path="/party/play" element={<PartyPlayPage />} />
          <Route path="/party/result" element={<PartyResultPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/markets/:assetId" element={<AssetDetailPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
