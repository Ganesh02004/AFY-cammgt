import React, { useState } from 'react';
import { 
  Bell, CheckCircle2, MessageSquare, Pin, Megaphone, 
  Send, Filter, ShieldCheck, Clock, Trash2, Check, 
  ChevronRight, AlertTriangle, ArrowRight, UserCheck, 
  Boxes, Warehouse, Sparkles, X, Eye, FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppNotification, Announcement, NotificationCategory, UserRole } from '../types';

interface NotificationsViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { 
    currentUser, users, notifications, announcements, unreadNotificationCount,
    markNotificationAsRead, markAllNotificationsAsRead, deleteNotification,
    createAnnouncement, acknowledgeAnnouncement, togglePinAnnouncement, deleteAnnouncement
  } = useApp();

  const [activeTab, setActiveTab] = useState<'notifications' | 'announcements'>('notifications');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  // New Announcement Form State (Admin only)
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annRecipientScope, setAnnRecipientScope] = useState<'ALL' | 'ROLE' | 'SELECTED_USERS'>('ALL');
  const [annTargetRole, setAnnTargetRole] = useState<UserRole>('POSTMAN');
  const [annTargetUserIds, setAnnTargetUserIds] = useState<number[]>([]);
  const [annIsPinned, setAnnIsPinned] = useState(false);

  if (!currentUser) return null;

  // Filter personal notifications for current user
  const userNotifications = notifications
    .filter(n => n.user_id === currentUser.id)
    .filter(n => {
      if (filterUnreadOnly && n.is_read) return false;
      if (filterCategory !== 'ALL' && n.category !== filterCategory) return false;
      return true;
    });

  // Filter announcements authorized for current user
  const authorizedAnnouncements = announcements.filter(a => {
    if (currentUser.role === 'ADMIN') return true;
    if (a.recipient_scope === 'ALL') return true;
    if (a.recipient_scope === 'ROLE' && a.target_role === currentUser.role) return true;
    if (a.recipient_scope === 'SELECTED_USERS' && a.target_user_ids?.includes(currentUser.id)) return true;
    return false;
  }).sort((a, b) => {
    // Pinned announcements first, then by date descending
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;

    createAnnouncement({
      title: annTitle.trim(),
      message: annMessage.trim(),
      author_id: currentUser.id,
      author_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      author_role: currentUser.role,
      recipient_scope: annRecipientScope,
      target_role: annRecipientScope === 'ROLE' ? annTargetRole : undefined,
      target_user_ids: annRecipientScope === 'SELECTED_USERS' ? annTargetUserIds : undefined,
      is_pinned: annIsPinned
    });

    setShowAddAnnouncement(false);
    setAnnTitle('');
    setAnnMessage('');
    setAnnRecipientScope('ALL');
    setAnnIsPinned(false);
    setAnnTargetUserIds([]);
  };

  const getCategoryBadge = (category: NotificationCategory) => {
    switch (category) {
      case 'TASK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">TASK</span>;
      case 'INVENTORY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">INVENTORY</span>;
      case 'TRANSFER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">TRANSFER</span>;
      case 'APPROVAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">APPROVAL</span>;
      case 'ANNOUNCEMENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">CHATTER</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">SYSTEM</span>;
    }
  };

  const handleNotificationAction = (notif: AppNotification) => {
    if (!notif.is_read) {
      markNotificationAsRead(notif.id);
    }
    if (notif.action_view) {
      onNavigate(notif.action_view, notif.action_params || {});
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            <Bell className="w-4 h-4" />
            <span>Chatter & Notifications Center</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Communications & Alert Stream
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time assignment updates, custody transfer requests, registration approvals, and Admin company broadcasts.
          </p>
        </div>

        {currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setShowAddAnnouncement(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Megaphone className="w-4 h-4" />
            <span>Post Chatter Announcement</span>
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'notifications'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>My Alerts & Actions</span>
          {unreadNotificationCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white font-mono">
              {unreadNotificationCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`pb-3 transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'announcements'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chatter Company Feed ({authorizedAnnouncements.length})</span>
        </button>
      </div>

      {/* TAB 1: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="font-bold text-slate-500 uppercase text-[10px] mr-1">Filter:</span>
              <button
                onClick={() => setFilterCategory('ALL')}
                className={`px-2.5 py-1 rounded-lg transition font-semibold ${
                  filterCategory === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterCategory('TASK')}
                className={`px-2.5 py-1 rounded-lg transition font-semibold ${
                  filterCategory === 'TASK' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tasks
              </button>
              <button
                onClick={() => setFilterCategory('TRANSFER')}
                className={`px-2.5 py-1 rounded-lg transition font-semibold ${
                  filterCategory === 'TRANSFER' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Transfers
              </button>
              <button
                onClick={() => setFilterCategory('APPROVAL')}
                className={`px-2.5 py-1 rounded-lg transition font-semibold ${
                  filterCategory === 'APPROVAL' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Approvals
              </button>
              <button
                onClick={() => setFilterCategory('INVENTORY')}
                className={`px-2.5 py-1 rounded-lg transition font-semibold ${
                  filterCategory === 'INVENTORY' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Inventory
              </button>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={filterUnreadOnly}
                  onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Unread only</span>
              </label>

              {unreadNotificationCount > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead(currentUser.id)}
                  className="font-bold text-indigo-600 hover:text-indigo-800 transition"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          {userNotifications.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 text-sm">No notifications found</h4>
              <p className="text-xs text-slate-400 mt-1">
                {filterUnreadOnly ? "You're all caught up! No unread notifications." : "No alerts recorded for your account."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {userNotifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                    notif.is_read 
                      ? 'bg-white border-slate-200 text-slate-700' 
                      : 'bg-indigo-50/50 border-indigo-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    <div className="mt-0.5">
                      {!notif.is_read ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse mt-1.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-slate-300 mt-0.5" />
                      )}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getCategoryBadge(notif.category)}
                        <h4 className="font-extrabold text-xs text-slate-900">{notif.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.action_view && (
                        <div className="pt-1.5">
                          <button
                            onClick={() => handleNotificationAction(notif)}
                            className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                          >
                            <span>Open {notif.action_view.replace('-', ' ')}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    {!notif.is_read && (
                      <button
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Dismiss notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHATTER ANNOUNCEMENT FEED */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {authorizedAnnouncements.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 text-sm">No announcements published</h4>
              <p className="text-xs text-slate-400 mt-1">Company-wide news and updates will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {authorizedAnnouncements.map(ann => {
                const isAcknowledged = ann.acknowledged_by_user_ids.includes(currentUser.id);

                return (
                  <div
                    key={ann.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 transition ${
                      ann.is_pinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                    }`}
                  >
                    {/* Top Row: Author, Role, Pinned status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          {ann.author_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-900">{ann.author_name}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">
                              {ann.author_role}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(ann.published_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {ann.is_pinned && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                            <Pin className="w-3 h-3 text-amber-700" />
                            <span>Pinned</span>
                          </span>
                        )}

                        {currentUser.role === 'ADMIN' && (
                          <>
                            <button
                              onClick={() => togglePinAnnouncement(ann.id)}
                              className={`p-1.5 rounded-lg transition ${
                                ann.is_pinned ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={ann.is_pinned ? "Unpin announcement" : "Pin to top"}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteAnnouncement(ann.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="Delete announcement"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Announcement Content */}
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{ann.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                        {ann.message}
                      </p>
                    </div>

                    {/* Footer / Read Acknowledgement */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-slate-400">
                        Audience: <span className="font-semibold text-slate-600">{ann.recipient_scope}</span>
                        {currentUser.role === 'ADMIN' && (
                          <span className="ml-2 font-mono text-indigo-600">
                            • {ann.acknowledged_by_user_ids.length} staff acknowledgements
                          </span>
                        )}
                      </div>

                      {isAcknowledged ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Acknowledged</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => acknowledgeAnnouncement(ann.id, currentUser.id)}
                          className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition cursor-pointer"
                        >
                          Mark as Acknowledged
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Admin Post Announcement Modal */}
      {showAddAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Broadcast Chatter Announcement</h3>
              </div>
              <button
                onClick={() => setShowAddAnnouncement(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Title *</label>
                <input
                  type="text"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Critical Battery Pack Safety Notice"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience *</label>
                <select
                  value={annRecipientScope}
                  onChange={(e) => setAnnRecipientScope(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="ALL">Entire Organization (All Users)</option>
                  <option value="ROLE">Specific Role Only</option>
                  <option value="SELECTED_USERS">Select Individual Users</option>
                </select>
              </div>

              {annRecipientScope === 'ROLE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Role</label>
                  <select
                    value={annTargetRole}
                    onChange={(e) => setAnnTargetRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="POSTMAN">Postman / Field Officers</option>
                    <option value="MANAGEMENT">Management Staff</option>
                    <option value="ADMIN">Administrators</option>
                  </select>
                </div>
              )}

              {annRecipientScope === 'SELECTED_USERS' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Users</label>
                  <div className="border border-slate-200 rounded-xl p-2.5 max-h-32 overflow-y-auto space-y-1 bg-slate-50">
                    {users.map(u => (
                      <label key={u.id} className="flex items-center space-x-2 text-xs cursor-pointer p-1 rounded hover:bg-white">
                        <input
                          type="checkbox"
                          checked={annTargetUserIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setAnnTargetUserIds(prev => [...prev, u.id]);
                            else setAnnTargetUserIds(prev => prev.filter(id => id !== u.id));
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{u.first_name} {u.last_name} (@{u.username})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Body *</label>
                <textarea
                  rows={4}
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="Enter detailed notice, instructions, or operational guidance..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="annPin"
                  checked={annIsPinned}
                  onChange={(e) => setAnnIsPinned(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="annPin" className="text-xs font-bold text-slate-700 cursor-pointer flex items-center space-x-1">
                  <Pin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pin this announcement to top of feed</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAnnouncement(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish to Feed</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
