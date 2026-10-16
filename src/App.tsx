import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { QRScannerModal } from './components/scanner/QRScannerModal';

// Views
import { DashboardView } from './views/DashboardView';
import { MyInventoryView } from './views/MyInventoryView';
import { MasterInventoryView } from './views/MasterInventoryView';
import { DeviceDetailView } from './views/DeviceDetailView';
import { DeviceLabelPrintView } from './views/DeviceLabelPrintView';
import { IntakeView } from './views/IntakeView';
import { AssignWorkerView } from './views/AssignWorkerView';
import { TransfersView } from './views/TransfersView';
import { ReturnProcessView } from './views/ReturnProcessView';
import { InspectionQueueView } from './views/InspectionQueueView';
import { IncidentsView } from './views/IncidentsView';
import { MassAssignmentView } from './views/MassAssignmentView';
import { TasksView } from './views/TasksView';
import { ClientsView } from './views/ClientsView';
import { WorkersView } from './views/WorkersView';
import { EmployerCompaniesView } from './views/EmployerCompaniesView';
import { ReportsView } from './views/ReportsView';
import { UserManagementView } from './views/UserManagementView';
import { AuditLogsView } from './views/AuditLogsView';
import { ProjectsView } from './views/ProjectsView';
import { StudioView } from './views/StudioView';
import { AuthView } from './views/AuthView';
import { ProfileView } from './views/ProfileView';
import { NotificationsView } from './views/NotificationsView';

import { Device } from './types';
import { AlertCircle, Clock } from 'lucide-react';

export const App: React.FC = () => {
  const { currentUser } = useApp();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [viewParams, setViewParams] = useState<any>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const navigateTo = (view: string, params: any = {}) => {
    setCurrentView(view);
    setViewParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeviceScanned = (device: Device) => {
    setIsScannerOpen(false);
    navigateTo('device-detail', { deviceId: device.id });
  };

  // If user is not logged in, show Auth View
  if (!currentUser) {
    return <AuthView onSuccess={() => navigateTo('dashboard')} />;
  }

  // If user is pending approval
  const isPendingApproval = currentUser.approval_status === 'PENDING';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-indigo-500 selection:text-white max-w-full overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Pending Account Notice Banner */}
      {isPendingApproval && (
        <div className="bg-amber-500 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            Your account is currently PENDING approval by an Administrator. Certain actions may be restricted until authorized.
          </span>
        </div>
      )}

      {/* Main App Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
        {(() => {
          switch (currentView) {
            case 'dashboard':
              return (
                <DashboardView
                  onNavigate={navigateTo}
                  onOpenScanner={() => setIsScannerOpen(true)}
                />
              );

            case 'my_inventory':
            case 'my-inventory':
              return (
                <MyInventoryView
                  onNavigate={navigateTo}
                  onOpenScanner={() => setIsScannerOpen(true)}
                />
              );

            case 'master-inventory':
            case 'master_inventory':
              return (
                <MasterInventoryView
                  onNavigate={navigateTo}
                  onOpenScanner={() => setIsScannerOpen(true)}
                  initialFilterStatus={viewParams?.status}
                />
              );

            case 'device-detail':
            case 'device_detail':
              return (
                <DeviceDetailView
                  deviceId={viewParams?.deviceId || 1}
                  onNavigate={navigateTo}
                  onBack={() => navigateTo('dashboard')}
                />
              );

            case 'print-label':
            case 'print_label':
            case 'device_label':
              return (
                <DeviceLabelPrintView
                  deviceId={viewParams?.deviceId}
                  deviceIds={viewParams?.deviceIds}
                  onBack={() => navigateTo(viewParams?.deviceId ? 'device-detail' : 'master-inventory', { deviceId: viewParams?.deviceId })}
                />
              );

            case 'intake':
            case 'collect':
              return <IntakeView onNavigate={navigateTo} />;

            case 'assign':
            case 'assign-worker':
            case 'assign_worker':
              return (
                <AssignWorkerView
                  onNavigate={navigateTo}
                  preselectedDeviceId={viewParams?.deviceId}
                />
              );

            case 'transfers':
              return (
                <TransfersView
                  onNavigate={navigateTo}
                  initiateDeviceId={viewParams?.deviceId}
                />
              );

            case 'returns':
            case 'return-process':
            case 'return_process':
              return (
                <ReturnProcessView
                  onNavigate={navigateTo}
                  preselectedDeviceId={viewParams?.deviceId}
                  preselectedWorkerId={viewParams?.workerId}
                />
              );

            case 'inspection':
            case 'inspection-queue':
            case 'inspection_queue':
              return <InspectionQueueView onNavigate={navigateTo} />;

            case 'incidents':
              return (
                <IncidentsView
                  onNavigate={navigateTo}
                  reportDeviceId={viewParams?.deviceId}
                />
              );

            case 'mass-assignment':
            case 'mass_assignment':
              return (
                <MassAssignmentView
                  onNavigate={navigateTo}
                  preselectedIds={viewParams?.deviceIds || []}
                />
              );

            case 'tasks':
              return <TasksView onNavigate={navigateTo} />;

            case 'projects':
              return (
                <ProjectsView
                  onNavigate={navigateTo}
                  initialProjectId={viewParams?.projectId}
                />
              );

            case 'clients':
              return (
                <ClientsView 
                  onNavigate={navigateTo}
                  initialClientId={viewParams?.clientId}
                  initialCreateMode={viewParams?.mode === 'create'}
                />
              );

            case 'workers':
              return <WorkersView onNavigate={navigateTo} />;

            case 'employers':
              return <EmployerCompaniesView onNavigate={navigateTo} />;

            case 'reports':
              return <ReportsView onNavigate={navigateTo} />;

            case 'users':
              return <UserManagementView onNavigate={navigateTo} />;

            case 'audit-logs':
            case 'audit_logs':
              return <AuditLogsView onNavigate={navigateTo} />;

            case 'studio':
              return <StudioView onNavigate={navigateTo} />;

            case 'profile':
              return <ProfileView onBack={() => navigateTo('dashboard')} />;

            case 'notifications':
              return <NotificationsView onNavigate={navigateTo} />;

            case 'auth':
              return <AuthView onSuccess={() => navigateTo('dashboard')} />;

            default:
              return (
                <DashboardView
                  onNavigate={navigateTo}
                  onOpenScanner={() => setIsScannerOpen(true)}
                />
              );
          }
        })()}
      </main>

      {/* Mobile Bottom Thumb Bar */}
      <BottomNav
        currentView={currentView}
        onNavigate={navigateTo}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* QR Scanner Overlay Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSelectDevice={handleDeviceScanned}
      />
    </div>
  );
};

export default App;
