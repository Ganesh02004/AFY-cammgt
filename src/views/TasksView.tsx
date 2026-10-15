import React, { useState } from 'react';
import { 
  ListTodo, Plus, CheckCircle2, Clock, AlertTriangle, 
  UserCheck, ArrowRightLeft, Warehouse, Check, Play
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Task } from '../types';

interface TasksViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onNavigate }) => {
  const { tasks, users, clients, workers, currentUser, createTask, updateTaskStatus } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // New task form state
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<Task['task_type']>('PICKUP');
  const [assignedUserId, setAssignedUserId] = useState<number>(currentUser?.id || users[0]?.id || 0);
  const [clientId, setClientId] = useState<number>(clients[0]?.id || 0);
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [scheduledTime, setScheduledTime] = useState(new Date().toISOString().substring(0, 16));

  const filtered = tasks.filter(t => {
    if (filterStatus === 'MY') return t.assigned_user_id === currentUser?.id;
    if (filterStatus === 'PENDING') return t.status === 'PENDING';
    if (filterStatus === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTask({
      title: title.trim(),
      task_type: taskType,
      assigned_user_id: assignedUserId,
      client_id: taskType === 'PICKUP' ? clientId : undefined,
      scheduled_time: scheduledTime,
      priority,
      status: 'PENDING'
    });

    setShowAdd(false);
    setTitle('');
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            <ListTodo className="w-4 h-4" />
            <span>Operational Schedule</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Field Tasks & Operational Missions ({tasks.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scheduled client pickups, deliveries, inspections, and equipment recovery routes.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 bg-white rounded-xl px-4 py-2">
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === 'ALL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          All Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setFilterStatus('MY')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === 'MY' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Assigned to Me
        </button>
        <button
          onClick={() => setFilterStatus('PENDING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === 'PENDING' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilterStatus('COMPLETED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === 'COMPLETED' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Completed
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filtered.map(t => {
          const assignee = users.find(u => u.id === t.assigned_user_id);
          const client = clients.find(c => c.id === t.client_id);
          const isMine = t.assigned_user_id === currentUser?.id;

          return (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.priority === 'URGENT' || t.priority === 'HIGH'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {t.priority}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                    {t.task_type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : (t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800')
                  }`}>
                    {t.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{t.title}</h3>

                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                  <span>Assignee: <strong className="text-slate-700">{assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Staff'}</strong></span>
                  {client && <span>Client: <strong className="text-slate-700">{client.name}</strong></span>}
                  <span>Scheduled: <strong className="text-slate-700">{new Date(t.scheduled_time).toLocaleString()}</strong></span>
                </div>

                {t.outcome && (
                  <div className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg">
                    Outcome: {t.outcome}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                {t.status === 'PENDING' && (
                  <button
                    onClick={() => updateTaskStatus(t.id, 'IN_PROGRESS')}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition flex items-center space-x-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Task</span>
                  </button>
                )}

                {t.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => {
                      const notes = prompt("Enter completion notes / outcome:") || "Task completed on schedule.";
                      updateTaskStatus(t.id, 'COMPLETED', notes);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Completed</span>
                  </button>
                )}

                {t.task_type === 'PICKUP' && t.status !== 'COMPLETED' && (
                  <button
                    onClick={() => onNavigate('intake')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                  >
                    Launch Intake
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 space-y-4 border border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-lg">Schedule Operational Task</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Collect 5 Bodycams from Apex Sector 24"
                  className="form-input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as Task['task_type'])}
                    className="form-select text-xs"
                  >
                    <option value="PICKUP">Client Pickup</option>
                    <option value="DELIVERY">Worker Handover</option>
                    <option value="RETURN">Worker Return</option>
                    <option value="INSPECTION">Inspection</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task['priority'])}
                    className="form-select text-xs font-semibold"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Field Staff *</label>
                  <select
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(Number(e.target.value))}
                    className="form-select text-xs"
                    required
                  >
                    {users.filter(u => u.is_active).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.role}) — {u.work_location || 'Field'}
                      </option>
                    ))}
                  </select>
                </div>

                {taskType === 'PICKUP' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Client Company</label>
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(Number(e.target.value))}
                      className="form-select text-xs"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="form-input text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
                >
                  Schedule Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
