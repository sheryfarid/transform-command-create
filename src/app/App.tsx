import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useProgrammeStore } from '../stores/programmeStore';
import { useDocumentPipeline } from '../hooks/useDocumentPipeline';
import { AppShell } from './AppShell';
import { SetupPage } from '../components/setup/SetupPage';
import { DashboardPage } from '../components/dashboard/DashboardPage';
import { InventoryPage } from '../components/discovery/InventoryPage';
import { EvidencePage } from '../components/discovery/EvidencePage';
import { DiscoveryPage } from '../components/discovery/DiscoveryPage';
import { ConsultantPage } from '../components/strategy/ConsultantPage';
import { ScenariosPage } from '../components/strategy/ScenariosPage';
import { GovernancePage } from '../components/governance/GovernancePage';
import { FlowPage } from '../components/flow/FlowPage';

function RequireProgramme({ children }: { children: ReactNode }) {
  const hasProgramme = useProgrammeStore((s) => !!s.programme);
  return hasProgramme ? <>{children}</> : <Navigate to="/programmes/new" replace />;
}

export function App() {
  useDocumentPipeline();
  const seedDemo = useProgrammeStore((s) => s.seedDemo);
  useEffect(() => {
    seedDemo();
  }, [seedDemo]);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/programmes/new" element={<SetupPage />} />
        <Route element={<RequireProgramme><AppShell /></RequireProgramme>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/landscapes" element={<InventoryPage />} />
          <Route path="/landscapes/:id" element={<InventoryPage />} />
          <Route path="/documents" element={<EvidencePage />} />
          <Route path="/discovery" element={<DiscoveryPage />} />
          <Route path="/strategy" element={<ConsultantPage />} />
          <Route path="/strategy/scenarios" element={<ScenariosPage />} />
          <Route path="/governance" element={<GovernancePage />} />
          <Route path="/flow" element={<FlowPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
