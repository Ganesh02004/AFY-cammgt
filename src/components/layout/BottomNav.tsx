import React from 'react';
import { Home, QrCode, Box, ListTodo, ArrowRightLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenScanner: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, onOpenScanner }) => {
  const { currentUser, tasks, transfers } = useApp();

  if (!currentUser) return null;

  const pendingTasks = tasks.filter(t => t.assigned_user_id === currentUser.id && t.status === 'PENDING').length;
  const pendingTransfers = transfers.filter(t => t.receiver_id === currentUser.id && t.status === 'PENDING').length;

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 lg:hidden no-print">
      <div className="grid grid-cols-5 h-16">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center space-y-1 transition ${
            currentView === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={onOpenScanner}
          className="flex flex-col items-center justify-center space-y-1 text-slate-500 hover:text-indigo-600 transition"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md -mt-3 border-2 border-white">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-indigo-600">Scan QR</span>
        </button>

        <button
          onClick={() => onNavigate('my_inventory')}
          className={`flex flex-col items-center justify-center space-y-1 transition ${
            currentView === 'my_inventory' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Box className="w-5 h-5" />
          <span className="text-[10px]">My Stock</span>
        </button>

        <button
          onClick={() => onNavigate('tasks')}
          className={`relative flex flex-col items-center justify-center space-y-1 transition ${
            currentView === 'tasks' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListTodo className="w-5 h-5" />
          <span className="text-[10px]">Tasks</span>
          {pendingTasks > 0 && (
            <span className="absolute top-2 right-4 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
              {pendingTasks}
            </span>
          )}
        </button>

        <button
          onClick={() => onNavigate('transfers')}
          className={`relative flex flex-col items-center justify-center space-y-1 transition ${
            currentView === 'transfers' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-5 h-5" />
          <span className="text-[10px]">Transfers</span>
          {pendingTransfers > 0 && (
            <span className="absolute top-2 right-4 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
              {pendingTransfers}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
