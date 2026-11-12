import { Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/auth/LoginPage';
import { HomePage } from '@/home/HomePage';
import { AgentRoute } from '@/shell/AgentRoute';
import { Layout } from '@/shell/Layout';
import { NotFound } from '@/shell/NotFound';
import { ProtectedRoute } from '@/shell/ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="agents/:agentId/*" element={<AgentRoute />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
