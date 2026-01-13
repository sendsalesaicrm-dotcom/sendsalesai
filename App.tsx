import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LiveChat from './pages/LiveChat';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';
import AIAgents from './pages/AIAgents';
import Settings, { SettingsProvider } from './pages/Settings';
import SettingsOverview from './pages/SettingsOverview';
import SettingsGeneral from './pages/SettingsGeneral';
import SettingsMeta from './pages/SettingsMeta';
import SettingsEvolution from './pages/SettingsEvolution';
import TeamSettings from './pages/TeamSettings';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import JoinTeam from './pages/JoinTeam';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/register" element={<SignUp />} />
              <Route path="/join" element={<JoinTeam />} />
              <Route element={
                <ThemeProvider>
                  <ProtectedRoute />
                </ThemeProvider>
              }>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="chat" element={<LiveChat />} />
                  <Route path="campaigns" element={<Campaigns />} />
                  <Route path="leads" element={<Leads />} />
                  <Route path="ai-agents" element={<AIAgents />} />
                  <Route path="team" element={<TeamSettings />} />
                  <Route path="settings" element={<Settings />}>
                    <Route index element={<SettingsOverview />} />
                    <Route path="general" element={<SettingsGeneral />} />
                    <Route path="meta" element={<SettingsMeta />} />
                    <Route path="evolution" element={<SettingsEvolution />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;