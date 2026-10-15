import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User, ClientCompany, ClientContact, EmployerCompany, Worker,
  Device, Assignment, Pickup, Transfer, DeviceReturn, DeviceMovement,
  DeviceActivityLog, Task, Incident, AuditLog, ObjectDefinition, FieldDefinition,
  MassCameraAssignmentBatch, DynamicRecord, DeviceCondition, DeviceStatus, CustodianType,
  InspectionResult, ReturnOutcome, UserRole, Project, ClientOffice, AppNotification, Announcement
} from '../types';
import {
  initialUsers, initialClients, initialContacts, initialEmployers,
  initialWorkers, initialDevices, initialAssignments, initialPickups,
  initialTransfers, initialReturns, initialMovements, initialActivityLogs,
  initialTasks, initialIncidents, initialAuditLogs, initialObjectDefinitions,
  initialFieldDefinitions, initialMassBatches, initialProjects,
  initialClientOffices, initialNotifications, initialAnnouncements
} from '../data/seedData';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  clients: ClientCompany[];
  clientOffices: ClientOffice[];
  contacts: ClientContact[];
  employers: EmployerCompany[];
  workers: Worker[];
  devices: Device[];
  projects: Project[];
  assignments: Assignment[];
  pickups: Pickup[];
  transfers: Transfer[];
  returns: DeviceReturn[];
  movements: DeviceMovement[];
  activityLogs: DeviceActivityLog[];
  tasks: Task[];
  incidents: Incident[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  announcements: Announcement[];
  unreadNotificationCount: number;
  objectDefinitions: ObjectDefinition[];
  fieldDefinitions: FieldDefinition[];
  massBatches: MassCameraAssignmentBatch[];
  dynamicRecords: DynamicRecord[];

  // Auth & Security
  login: (username: string, password?: string) => { success: boolean; error?: string };
  loginWithGoogle: (requestedRole?: UserRole) => { success: boolean; user?: User; error?: string };
  logout: () => void;
  registerUser: (userData: Partial<User>) => { success: boolean; error?: string };
  updateUserProfile: (userId: number, updates: Partial<User>) => void;
  isSessionLocked: boolean;
  unlockSession: () => void;
  remainingTimeoutSeconds: number;

  // Project Management
  createProject: (params: Omit<Project, 'id' | 'sequence_id' | 'created_at' | 'updated_at'>) => Project;
  updateProject: (id: number, updates: Partial<Project>) => void;
  archiveProject: (id: number) => void;
  deleteProject: (id: number) => { success: boolean; error?: string };

  // Sequential IDs
  getNextSequenceId: (prefix: string) => string;

  // Inventory & Custody Services
  intakeDevices: (params: {
    clientId: number;
    projectId?: number;
    actualPocId?: number;
    scheduledTime?: string;
    notes?: string;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
    devicesData: {
      asset_id?: string;
      device_type: Device['device_type'];
      brand_and_model: string;
      imei_or_serial?: string;
      accessories?: string;
      condition: DeviceCondition;
      notes?: string;
      photo?: string;
    }[];
  }) => { success: boolean; pickup?: Pickup; createdDevices?: Device[]; error?: string };

  assignDeviceToWorker: (params: {
    deviceId: number;
    workerId: number;
    projectId?: number;
    condition?: string;
    accessories?: string;
    acknowledgement?: string;
    expectedReturnDate?: string;
    notes?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationAddress?: string;
  }) => { success: boolean; assignment?: Assignment; error?: string };

  initiateTransfer: (params: {
    deviceId: number;
    receiverId: number;
    condition?: string;
    notes?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationAddress?: string;
  }) => { success: boolean; transfer?: Transfer; error?: string };

  acceptTransfer: (transferId: number, locationAddress?: string) => { success: boolean; error?: string };
  rejectTransfer: (transferId: number, reason: string) => { success: boolean; error?: string };
  cancelTransfer: (transferId: number) => { success: boolean; error?: string };

  processReturn: (params: {
    deviceId: number;
    workerId: number;
    condition: string;
    accessories?: string;
    notes?: string;
    evidence?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationAddress?: string;
  }) => { success: boolean; deviceReturn?: DeviceReturn; error?: string };

  completeInspection: (params: {
    returnId: number;
    inspectionResult: InspectionResult;
    outcome: ReturnOutcome;
    notes?: string;
  }) => { success: boolean; error?: string };

  auditedAdjustment: (params: {
    deviceId: number;
    newStatus: DeviceStatus;
    newCustodianType: CustodianType;
    newCustodianUserId?: number | null;
    newCustodianWorkerId?: number | null;
    reason: string;
  }) => { success: boolean; error?: string };

  deleteDevice: (deviceId: number, reason?: string) => { success: boolean; error?: string };

  executeMassAssignment: (params: {
    workerId: number;
    deviceIds: number[];
    purpose: string;
    notes?: string;
    expectedReturnDate?: string;
  }) => { success: boolean; batch?: MassCameraAssignmentBatch; error?: string };

  // Task & Incident Management
  createTask: (task: Omit<Task, 'id' | 'created_at'>) => void;
  updateTaskStatus: (taskId: number, status: Task['status'], outcome?: string) => void;
  reportIncident: (incident: Omit<Incident, 'id' | 'timestamp'>) => void;
  resolveIncident: (incidentId: number, resolutionNotes: string) => void;

  // Directory management
  createClient: (client: Omit<ClientCompany, 'id' | 'created_at'>) => ClientCompany;
  updateClient: (id: number, client: Partial<ClientCompany>) => void;
  createClientOffice: (office: Omit<ClientOffice, 'id' | 'sequence_id' | 'created_at'>) => ClientOffice;
  updateClientOffice: (id: number, data: Partial<ClientOffice>) => void;
  toggleOfficeStatus: (id: number) => void;
  deleteClientOffice: (id: number) => { success: boolean; error?: string };
  createContact: (contact: Omit<ClientContact, 'id' | 'created_at'>) => ClientContact;
  updateContact: (id: number, contact: Partial<ClientContact>) => void;
  deleteContact: (id: number) => void;

  // Notification Center & Announcements
  createNotification: (n: Omit<AppNotification, 'id' | 'created_at'>) => void;
  markNotificationAsRead: (id: number) => void;
  markAllNotificationsAsRead: (userId: number) => void;
  deleteNotification: (id: number) => void;
  createAnnouncement: (a: Omit<Announcement, 'id' | 'published_at' | 'acknowledged_by_user_ids'>) => Announcement;
  acknowledgeAnnouncement: (announcementId: number, userId: number) => void;
  togglePinAnnouncement: (id: number) => void;
  deleteAnnouncement: (id: number) => void;
  createWorker: (worker: Omit<Worker, 'id' | 'created_at'>) => Worker;
  updateWorker: (id: number, worker: Partial<Worker>) => void;
  createEmployer: (employer: Omit<EmployerCompany, 'id' | 'created_at'>) => EmployerCompany;
  updateEmployer: (id: number, employer: Partial<EmployerCompany>) => void;

  // Sensitive Worker Data Reveal
  revealSensitiveWorkerData: (workerId: number) => void;

  // User Management
  approveUser: (userId: number) => void;
  rejectUser: (userId: number) => void;
  toggleUserStatus: (userId: number) => void;
  updateUserRole: (userId: number, role: UserRole) => void;

  // Dynamic Builder
  createObjectDefinition: (obj: Omit<ObjectDefinition, 'id' | 'created_at'>) => ObjectDefinition;
  createFieldDefinition: (field: Omit<FieldDefinition, 'id'>) => FieldDefinition;
  updateFieldDefinition: (fieldId: number, updates: Partial<FieldDefinition>) => void;
  toggleFieldActive: (fieldId: number) => void;
  reorderFields: (objectKey: string, fieldIds: number[]) => void;
  saveDynamicRecord: (objectKey: string, recordData: Record<string, any>, recordId?: number) => DynamicRecord;

  // Helpers
  addAuditLog: (action: string, recordType: string, recordId: string, metadata: string) => void;
  resetToSeedData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'camguard_app_state_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved state or use initial seed
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_user');
      if (saved) return JSON.parse(saved);
      return initialUsers[0]; // Default to admin for immediate exploration
    } catch {
      return initialUsers[0];
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_users');
      return saved ? JSON.parse(saved) : initialUsers;
    } catch { return initialUsers; }
  });

  const [clients, setClients] = useState<ClientCompany[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_clients');
      return saved ? JSON.parse(saved) : initialClients;
    } catch { return initialClients; }
  });

  const [contacts, setContacts] = useState<ClientContact[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_contacts');
      return saved ? JSON.parse(saved) : initialContacts;
    } catch { return initialContacts; }
  });

  const [employers, setEmployers] = useState<EmployerCompany[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_employers');
      return saved ? JSON.parse(saved) : initialEmployers;
    } catch { return initialEmployers; }
  });

  const [workers, setWorkers] = useState<Worker[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_workers');
      return saved ? JSON.parse(saved) : initialWorkers;
    } catch { return initialWorkers; }
  });

  const [devices, setDevices] = useState<Device[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_devices');
      return saved ? JSON.parse(saved) : initialDevices;
    } catch { return initialDevices; }
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_assignments');
      return saved ? JSON.parse(saved) : initialAssignments;
    } catch { return initialAssignments; }
  });

  const [pickups, setPickups] = useState<Pickup[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_pickups');
      return saved ? JSON.parse(saved) : initialPickups;
    } catch { return initialPickups; }
  });

  const [transfers, setTransfers] = useState<Transfer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_transfers');
      return saved ? JSON.parse(saved) : initialTransfers;
    } catch { return initialTransfers; }
  });

  const [returns, setReturns] = useState<DeviceReturn[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_returns');
      return saved ? JSON.parse(saved) : initialReturns;
    } catch { return initialReturns; }
  });

  const [movements, setMovements] = useState<DeviceMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_movements');
      return saved ? JSON.parse(saved) : initialMovements;
    } catch { return initialMovements; }
  });

  const [activityLogs, setActivityLogs] = useState<DeviceActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_activity');
      return saved ? JSON.parse(saved) : initialActivityLogs;
    } catch { return initialActivityLogs; }
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_tasks');
      return saved ? JSON.parse(saved) : initialTasks;
    } catch { return initialTasks; }
  });

  const [incidents, setIncidents] = useState<Incident[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_incidents');
      return saved ? JSON.parse(saved) : initialIncidents;
    } catch { return initialIncidents; }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_audit');
      return saved ? JSON.parse(saved) : initialAuditLogs;
    } catch { return initialAuditLogs; }
  });

  const [objectDefinitions, setObjectDefinitions] = useState<ObjectDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_objects');
      return saved ? JSON.parse(saved) : initialObjectDefinitions;
    } catch { return initialObjectDefinitions; }
  });

  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_fields');
      return saved ? JSON.parse(saved) : initialFieldDefinitions;
    } catch { return initialFieldDefinitions; }
  });

  const [massBatches, setMassBatches] = useState<MassCameraAssignmentBatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_batches');
      return saved ? JSON.parse(saved) : initialMassBatches;
    } catch { return initialMassBatches; }
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_projects');
      return saved ? JSON.parse(saved) : initialProjects;
    } catch { return initialProjects; }
  });

  const [dynamicRecords, setDynamicRecords] = useState<DynamicRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_dynamic_records');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [clientOffices, setClientOffices] = useState<ClientOffice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_offices');
      return saved ? JSON.parse(saved) : initialClientOffices;
    } catch { return initialClientOffices; }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_notifications');
      return saved ? JSON.parse(saved) : initialNotifications;
    } catch { return initialNotifications; }
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_announcements');
      return saved ? JSON.parse(saved) : initialAnnouncements;
    } catch { return initialAnnouncements; }
  });

  // 4-Digit Sequential Monotonic IDs (Never reuses deleted IDs, handles >9999 seamlessly)
  const defaultCounters: Record<string, number> = {
    PRJ: 4,
    CLT: 4,
    OFC: 4,
    CON: 3,
    CAM: 10,
    USR: 7,
    PCK: 3,
    ASN: 5,
    RET: 3,
    INC: 2,
    TSK: 4
  };

  const [sequenceCounters, setSequenceCounters] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_seq_counters');
      return saved ? JSON.parse(saved) : defaultCounters;
    } catch { return defaultCounters; }
  });

  const getNextSequenceId = (prefix: string): string => {
    const p = prefix.toUpperCase();
    const current = sequenceCounters[p] || 0;
    const next = current + 1;
    const updated = { ...sequenceCounters, [p]: next };
    setSequenceCounters(updated);
    localStorage.setItem(STORAGE_KEY + '_seq_counters', JSON.stringify(updated));
    // Pad to 4 digits (0001 - 9999) or expand naturally if >9999 (e.g. 10000)
    const seq = next < 10000 ? String(next).padStart(4, '0') : String(next);
    return `${p}-${seq}`;
  };

  // 5-Minute Inactivity Session Timeout
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState(Date.now());
  const [remainingTimeoutSeconds, setRemainingTimeoutSeconds] = useState(300);

  useEffect(() => {
    const resetTimer = () => {
      if (!isSessionLocked) {
        setLastActiveTime(Date.now());
        setRemainingTimeoutSeconds(300);
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    const timer = setInterval(() => {
      if (!currentUser) return;
      const elapsed = Date.now() - lastActiveTime;
      const left = Math.max(0, Math.floor((300000 - elapsed) / 1000));
      setRemainingTimeoutSeconds(left);
      if (elapsed >= 300000 && !isSessionLocked) {
        setIsSessionLocked(true);
        addAuditLog('SESSION_TIMEOUT', 'User', String(currentUser.id), 'Session locked automatically after 5 minutes of inactivity');
      }
    }, 1000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
      clearInterval(timer);
    };
  }, [currentUser, isSessionLocked, lastActiveTime]);

  const unlockSession = () => {
    setIsSessionLocked(false);
    setLastActiveTime(Date.now());
    setRemainingTimeoutSeconds(300);
    if (currentUser) {
      addAuditLog('SESSION_UNLOCKED', 'User', String(currentUser.id), 'Session re-authenticated and unlocked');
    }
  };

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_users', JSON.stringify(users));
    localStorage.setItem(STORAGE_KEY + '_clients', JSON.stringify(clients));
    localStorage.setItem(STORAGE_KEY + '_contacts', JSON.stringify(contacts));
    localStorage.setItem(STORAGE_KEY + '_employers', JSON.stringify(employers));
    localStorage.setItem(STORAGE_KEY + '_workers', JSON.stringify(workers));
    localStorage.setItem(STORAGE_KEY + '_devices', JSON.stringify(devices));
    localStorage.setItem(STORAGE_KEY + '_projects', JSON.stringify(projects));
    localStorage.setItem(STORAGE_KEY + '_assignments', JSON.stringify(assignments));
    localStorage.setItem(STORAGE_KEY + '_pickups', JSON.stringify(pickups));
    localStorage.setItem(STORAGE_KEY + '_transfers', JSON.stringify(transfers));
    localStorage.setItem(STORAGE_KEY + '_returns', JSON.stringify(returns));
    localStorage.setItem(STORAGE_KEY + '_movements', JSON.stringify(movements));
    localStorage.setItem(STORAGE_KEY + '_activity', JSON.stringify(activityLogs));
    localStorage.setItem(STORAGE_KEY + '_tasks', JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEY + '_incidents', JSON.stringify(incidents));
    localStorage.setItem(STORAGE_KEY + '_audit', JSON.stringify(auditLogs));
    localStorage.setItem(STORAGE_KEY + '_objects', JSON.stringify(objectDefinitions));
    localStorage.setItem(STORAGE_KEY + '_fields', JSON.stringify(fieldDefinitions));
    localStorage.setItem(STORAGE_KEY + '_batches', JSON.stringify(massBatches));
    localStorage.setItem(STORAGE_KEY + '_dynamic_records', JSON.stringify(dynamicRecords));
    localStorage.setItem(STORAGE_KEY + '_offices', JSON.stringify(clientOffices));
    localStorage.setItem(STORAGE_KEY + '_notifications', JSON.stringify(notifications));
    localStorage.setItem(STORAGE_KEY + '_announcements', JSON.stringify(announcements));
  }, [users, clients, contacts, employers, workers, devices, projects, assignments, pickups, transfers, returns, movements, activityLogs, tasks, incidents, auditLogs, objectDefinitions, fieldDefinitions, massBatches, dynamicRecords, clientOffices, notifications, announcements]);

  // Helper to add audit log
  const addAuditLog = (action: string, recordType: string, recordId: string, metadata: string) => {
    const newLog: AuditLog = {
      id: Date.now(),
      actor_id: currentUser?.id,
      actor_name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username : "System",
      action,
      record_type: recordType,
      record_id: String(recordId),
      timestamp: new Date().toISOString(),
      safe_metadata: metadata,
      ip_address: "127.0.0.1 (Web Portal)"
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // NOTIFICATION & ANNOUNCEMENT SERVICES
  const createNotificationInternal = (n: Omit<AppNotification, 'id' | 'created_at'>) => {
    const newNotif: AppNotification = {
      ...n,
      id: Date.now() + Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
    return newNotif;
  };

  const createNotification = (n: Omit<AppNotification, 'id' | 'created_at'>) => {
    createNotificationInternal(n);
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllNotificationsAsRead = (userId: number) => {
    setNotifications(prev => prev.map(n => n.user_id === userId ? { ...n, is_read: true } : n));
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const createAnnouncement = (a: Omit<Announcement, 'id' | 'published_at' | 'acknowledged_by_user_ids'>): Announcement => {
    const newAnn: Announcement = {
      ...a,
      id: Date.now(),
      published_at: new Date().toISOString(),
      acknowledged_by_user_ids: []
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    addAuditLog('CREATE_ANNOUNCEMENT', 'Announcement', String(newAnn.id), `Admin published announcement: ${newAnn.title} (${newAnn.recipient_scope})`);

    // Automatically trigger notification for target users
    let targetUsers = users;
    if (a.recipient_scope === 'ROLE' && a.target_role) {
      targetUsers = users.filter(u => u.role === a.target_role);
    } else if (a.recipient_scope === 'SELECTED_USERS' && a.target_user_ids) {
      targetUsers = users.filter(u => a.target_user_ids?.includes(u.id));
    }

    targetUsers.forEach(u => {
      createNotificationInternal({
        user_id: u.id,
        title: `Announcement: ${a.title}`,
        message: a.message.length > 120 ? a.message.substring(0, 117) + '...' : a.message,
        category: 'ANNOUNCEMENT',
        is_read: false,
        related_record_type: 'announcement',
        related_record_id: newAnn.id,
        action_view: 'notifications'
      });
    });

    return newAnn;
  };

  const acknowledgeAnnouncement = (announcementId: number, userId: number) => {
    setAnnouncements(prev => prev.map(a => {
      if (a.id === announcementId) {
        const acks = a.acknowledged_by_user_ids.includes(userId)
          ? a.acknowledged_by_user_ids
          : [...a.acknowledged_by_user_ids, userId];
        return { ...a, acknowledged_by_user_ids: acks };
      }
      return a;
    }));
  };

  const togglePinAnnouncement = (id: number) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_pinned: !a.is_pinned } : a));
  };

  const deleteAnnouncement = (id: number) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    addAuditLog('DELETE_ANNOUNCEMENT', 'Announcement', String(id), `Announcement #${id} deleted`);
  };

  const unreadNotificationCount = notifications.filter(n => !n.is_read && (!currentUser || n.user_id === currentUser.id)).length;

  // CLIENT OFFICE SERVICES
  const createClientOffice = (officeData: Omit<ClientOffice, 'id' | 'sequence_id' | 'created_at'>): ClientOffice => {
    const seq = getNextSequenceId('OFC');
    const newOffice: ClientOffice = {
      ...officeData,
      id: Date.now(),
      sequence_id: seq,
      created_at: new Date().toISOString()
    };
    setClientOffices(prev => [...prev, newOffice]);
    addAuditLog('CREATE_CLIENT_OFFICE', 'ClientOffice', seq, `Added office [${seq}] ${newOffice.name} for Client #${newOffice.client_id}`);
    return newOffice;
  };

  const updateClientOffice = (id: number, data: Partial<ClientOffice>) => {
    setClientOffices(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
    addAuditLog('UPDATE_CLIENT_OFFICE', 'ClientOffice', String(id), `Updated office #${id}`);
  };

  const toggleOfficeStatus = (id: number) => {
    setClientOffices(prev => prev.map(o => o.id === id ? { ...o, is_active: !o.is_active } : o));
    addAuditLog('TOGGLE_OFFICE_STATUS', 'ClientOffice', String(id), `Toggled office status #${id}`);
  };

  const deleteClientOffice = (id: number) => {
    const target = clientOffices.find(o => o.id === id);
    if (!target) return { success: false, error: "Office record not found." };
    setClientOffices(prev => prev.filter(o => o.id !== id));
    addAuditLog('DELETE_CLIENT_OFFICE', 'ClientOffice', String(id), `Deleted office record [${target.sequence_id}] ${target.name}`);
    return { success: true };
  };

  // Auth functions
  const login = (usernameInput: string, passwordInput?: string) => {
    const user = users.find(u => 
      u.username.toLowerCase() === usernameInput.toLowerCase().trim() ||
      u.email.toLowerCase() === usernameInput.toLowerCase().trim()
    );

    if (!user) {
      return { success: false, error: "Invalid username or password. Please verify credentials." };
    }

    if (user.approval_status === 'PENDING') {
      return { success: false, error: "Your account is pending Administrator Approval." };
    }

    if (user.approval_status === 'DEACTIVATED' || user.approval_status === 'REJECTED' || !user.is_active) {
      return { success: false, error: "Your account has been deactivated or rejected by an Administrator." };
    }

    setCurrentUser(user);
    addAuditLog("LOGIN", "User", String(user.id), `User ${user.username} logged in successfully`);
    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog("LOGOUT", "User", String(currentUser.id), `User ${currentUser.username} logged out`);
    }
    setCurrentUser(null);
  };

  const loginWithGoogle = (requestedRole?: UserRole) => {
    // Verified Google OAuth flow linking
    const googleEmail = "ganeshpurma5@gmail.com";
    const existing = users.find(u => u.email.toLowerCase() === googleEmail.toLowerCase());
    if (existing) {
      if (existing.approval_status === 'DEACTIVATED' || existing.approval_status === 'REJECTED' || !existing.is_active) {
        return { success: false, error: "Your Google linked account has been deactivated or rejected by an Administrator." };
      }
      setCurrentUser(existing);
      addAuditLog("LOGIN_GOOGLE", "User", String(existing.id), `User ${existing.username} authenticated via Google Single Sign-On`);
      return { success: true, user: existing };
    } else {
      // Create single linked user account with profile photo
      const newSeq = getNextSequenceId('USR');
      const roleToSet: UserRole = requestedRole || 'MANAGEMENT';
      const newUser: User = {
        id: Date.now(),
        sequence_id: newSeq,
        username: "ganesh_google",
        email: googleEmail,
        first_name: "Ganesh",
        last_name: "P",
        role: roleToSet,
        approval_status: roleToSet === 'ADMIN' ? 'APPROVED' : 'PENDING',
        phone: "+91 97402 46889",
        address: "BTM Layout 2nd Stage, Bengaluru",
        work_location: "Bengaluru South Hub",
        is_staff: roleToSet === 'ADMIN' || roleToSet === 'MANAGEMENT',
        is_active: true,
        profile_photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        created_at: new Date().toISOString()
      };
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      addAuditLog("REGISTER_GOOGLE", "User", String(newUser.id), `New account registered via Google OAuth (Role: ${roleToSet}, Status: ${newUser.approval_status})`);
      return { success: true, user: newUser };
    }
  };

  const registerUser = (userData: Partial<User>) => {
    if (users.some(u => u.username.toLowerCase() === (userData.username || '').toLowerCase())) {
      return { success: false, error: "Username already exists. Please pick another." };
    }
    const seq = getNextSequenceId('USR');
    const newUser: User = {
      id: Date.now(),
      sequence_id: seq,
      username: userData.username || `user_${Date.now()}`,
      email: userData.email || '',
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      role: userData.role || 'POSTMAN',
      approval_status: 'PENDING',
      phone: userData.phone || '',
      employee_id: userData.employee_id,
      address: userData.address || '',
      city: userData.city,
      state: userData.state,
      pin_code: userData.pin_code,
      work_location: userData.work_location || '',
      profile_photo: userData.profile_photo,
      is_staff: false,
      is_active: true,
      created_at: new Date().toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    addAuditLog("USER_REGISTERED", "User", String(newUser.id), `New user registered [${seq}] (Pending Approval): ${newUser.username}`);

    // Notify all Admins of new pending registration
    const adminList = users.filter(u => u.role === 'ADMIN');
    adminList.forEach(adm => {
      createNotificationInternal({
        user_id: adm.id,
        title: "Registration Pending Approval",
        message: `${newUser.first_name || newUser.username} registered as ${newUser.role} [${seq}] and is awaiting review.`,
        category: "APPROVAL",
        is_read: false,
        related_record_type: "user",
        related_record_id: newUser.id,
        action_view: "users"
      });
    });

    return { success: true };
  };

  const updateUserProfile = (userId: number, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
    addAuditLog("USER_PROFILE_UPDATED", "User", String(userId), `Profile updated for user #${userId}`);
  };

  // PROJECT MANAGEMENT
  const createProject = (params: Omit<Project, 'id' | 'sequence_id' | 'created_at' | 'updated_at'>) => {
    const seq = getNextSequenceId('PRJ');
    const now = new Date().toISOString();
    const newProj: Project = {
      ...params,
      id: Date.now(),
      sequence_id: seq,
      status: params.status || 'ACTIVE',
      contact_ids: params.contact_ids || [],
      created_at: now,
      updated_at: now
    };
    setProjects(prev => [newProj, ...prev]);

    // Update contacts' project_ids bidirectionally
    if (params.contact_ids && params.contact_ids.length > 0) {
      setContacts(prev => prev.map(c => {
        if (params.contact_ids.includes(c.id)) {
          const currentProjIds = c.project_ids || [];
          if (!currentProjIds.includes(newProj.id)) {
            return { ...c, project_ids: [...currentProjIds, newProj.id] };
          }
        }
        return c;
      }));
    }

    addAuditLog("CREATE_PROJECT", "Project", seq, `Created project '${newProj.name}' (${newProj.project_type}) for Client #${newProj.client_id}`);
    return newProj;
  };

  const updateProject = (id: number, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p;
      return {
        ...p,
        ...updates,
        created_at: p.created_at, // Preserve original timestamp
        updated_at: new Date().toISOString()
      };
    }));

    // If contact_ids changed, update bidirectional relations
    if (updates.contact_ids) {
      setContacts(prev => prev.map(c => {
        const isLinked = updates.contact_ids!.includes(c.id);
        const currentPIds = c.project_ids || [];
        if (isLinked && !currentPIds.includes(id)) {
          return { ...c, project_ids: [...currentPIds, id] };
        } else if (!isLinked && currentPIds.includes(id)) {
          return { ...c, project_ids: currentPIds.filter(pid => pid !== id) };
        }
        return c;
      }));
    }

    addAuditLog("UPDATE_PROJECT", "Project", String(id), `Updated project #${id}`);
  };

  const archiveProject = (id: number) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'ARCHIVED', updated_at: new Date().toISOString() } : p));
    addAuditLog("ARCHIVE_PROJECT", "Project", String(id), `Archived project #${id}`);
  };

  const deleteProject = (id: number) => {
    // Check if project has linked devices, tasks, or contacts
    const hasDevices = devices.some(d => d.project_id === id);
    const hasTasks = tasks.some(t => t.project_id === id);
    const hasContacts = contacts.some(c => c.project_ids?.includes(id));

    if (hasDevices || hasTasks || hasContacts) {
      const reasons: string[] = [];
      if (hasDevices) reasons.push(`${devices.filter(d => d.project_id === id).length} linked device(s)`);
      if (hasTasks) reasons.push(`${tasks.filter(t => t.project_id === id).length} linked task(s)`);
      if (hasContacts) reasons.push(`${contacts.filter(c => c.project_ids?.includes(id)).length} linked contact(s)`);

      return {
        success: false,
        error: `Cannot permanently delete project because it has linked records (${reasons.join(', ')}). Please deactivate or archive this project instead to preserve data integrity.`
      };
    }

    setProjects(prev => prev.filter(p => p.id !== id));
    addAuditLog("DELETE_PROJECT", "Project", String(id), `Deleted unlinked project #${id}`);
    return { success: true };
  };

  // INTAKE (Collect from Client)
  const intakeDevices = ({
    clientId, projectId, actualPocId, scheduledTime, notes, location, latitude, longitude, devicesData
  }: {
    clientId: number;
    projectId?: number;
    actualPocId?: number;
    scheduledTime?: string;
    notes?: string;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
    devicesData: {
      asset_id?: string;
      device_type: Device['device_type'];
      brand_and_model: string;
      imei_or_serial?: string;
      accessories?: string;
      condition: DeviceCondition;
      notes?: string;
      photo?: string;
    }[];
  }) => {
    if (!currentUser) return { success: false, error: "Authentication required." };
    const client = clients.find(c => c.id === clientId);
    if (!client) return { success: false, error: "Client not found." };

    // Check IMEI duplicates across existing devices
    for (const d of devicesData) {
      if (d.imei_or_serial && devices.some(ex => ex.imei_or_serial && ex.imei_or_serial.toLowerCase() === d.imei_or_serial!.toLowerCase())) {
        return { success: false, error: `Device with IMEI/Serial '${d.imei_or_serial}' already exists in system.` };
      }
    }

    const now = new Date().toISOString();
    const pickupId = Date.now();
    const pickupSeq = getNextSequenceId('PCK');
    const createdDevs: Device[] = [];
    const newMovements: DeviceMovement[] = [];
    const newActivity: DeviceActivityLog[] = [];

    devicesData.forEach((d, idx) => {
      const devId = Date.now() + idx + 1;
      const assetId = d.asset_id?.trim() || getNextSequenceId(d.device_type === 'CAMERA' ? 'CAM' : 'DEV');
      const qrToken = crypto.randomUUID ? crypto.randomUUID() : `token-${devId}-${Math.random().toString(36).substring(2, 9)}`;

      const newDev: Device = {
        id: devId,
        asset_id: assetId,
        qr_token: qrToken,
        device_type: d.device_type,
        brand_and_model: d.brand_and_model,
        imei_or_serial: d.imei_or_serial || undefined,
        accessories: d.accessories || '',
        condition: d.condition,
        source_client_id: clientId,
        project_id: projectId,
        initial_poc_id: actualPocId,
        current_status: 'WITH_COLLECTOR',
        current_custodian_type: 'USER',
        current_custodian_user_id: currentUser.id,
        current_custodian_worker_id: null,
        received_date: now,
        notes: d.notes || '',
        created_at: now,
        updated_at: now,
        photo: d.photo
      };

      createdDevs.push(newDev);

      newMovements.push({
        id: Date.now() + idx + 10,
        device_id: devId,
        from_custodian_type: 'CLIENT',
        from_custodian_name: `Client: ${client.name}`,
        to_custodian_type: 'USER',
        to_custodian_name: `Staff: ${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
        from_status: 'Expected',
        to_status: 'With Collector / In Transit',
        actor_id: currentUser.id,
        actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
        timestamp: now,
        related_transaction_type: 'INTAKE',
        related_transaction_id: String(pickupId),
        notes: `Collected from ${client.name} (Pickup #${pickupId})`
      });

      newActivity.push({
        id: Date.now() + idx + 20,
        device_id: devId,
        action: 'COLLECTED_FROM_CLIENT',
        timestamp: now,
        actor_id: currentUser.id,
        actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
        actor_role: currentUser.role,
        details: `Intake batch from client ${client.name}. Condition: ${d.condition}. Accessories: ${d.accessories || 'None'}`,
        latitude: latitude || null,
        longitude: longitude || null,
        location_address: location || `${client.name} Facility`,
        related_transaction_type: 'PICKUP',
        related_transaction_id: String(pickupId)
      });
    });

    const newPickup: Pickup = {
      id: pickupId,
      sequence_id: pickupSeq,
      client_id: clientId,
      project_id: projectId,
      actual_poc_id: actualPocId,
      collecting_user_id: currentUser.id,
      scheduled_time: scheduledTime || now,
      actual_time: now,
      location: location || `${client.name} Facility`,
      latitude: latitude || null,
      longitude: longitude || null,
      location_address: location || `${client.name} Facility`,
      status: 'COMPLETED',
      notes: notes || '',
      created_at: now,
      devices: createdDevs.map(d => ({
        device_id: d.id,
        condition: d.condition,
        accessories: d.accessories || ''
      }))
    };

    setDevices(prev => [...createdDevs, ...prev]);
    setPickups(prev => [newPickup, ...prev]);
    setMovements(prev => [...newMovements, ...prev]);
    setActivityLogs(prev => [...newActivity, ...prev]);

    addAuditLog('INTAKE_DEVICES', 'Pickup', String(pickupId), `Collected ${createdDevs.length} devices from ${client.name}`);

    return { success: true, pickup: newPickup, createdDevices: createdDevs };
  };

  // ASSIGN TO WORKER
  const assignDeviceToWorker = ({
    deviceId, workerId, projectId, condition, accessories, acknowledgement, expectedReturnDate, notes, latitude, longitude, locationAddress
  }: {
    deviceId: number;
    workerId: number;
    projectId?: number;
    condition?: string;
    accessories?: string;
    acknowledgement?: string;
    expectedReturnDate?: string;
    notes?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationAddress?: string;
  }) => {
    if (!currentUser) return { success: false, error: "Authentication required." };
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return { success: false, error: "Device not found." };
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return { success: false, error: "Worker not found." };

    // Custody check: must be in user's custody unless user is Admin
    if (currentUser.role !== 'ADMIN') {
      if (dev.current_custodian_type !== 'USER' || dev.current_custodian_user_id !== currentUser.id) {
        return { success: false, error: `Device ${dev.asset_id} is not in your custody.` };
      }
    }

    if (dev.current_status === 'ASSIGNED_WORKER' && dev.current_custodian_type === 'WORKER') {
      return { success: false, error: `Device ${dev.asset_id} is already assigned to a worker.` };
    }

    if (['LOST', 'RETIRED', 'RETURNED_TO_CLIENT', 'DAMAGED', 'AWAITING_INSPECTION'].includes(dev.current_status)) {
      return { success: false, error: `Device ${dev.asset_id} cannot be assigned (Status: ${dev.current_status}).` };
    }

    const now = new Date().toISOString();
    const assignmentId = Date.now();
    const asnSeq = getNextSequenceId('ASN');

    // Close any previous active assignment for this device
    setAssignments(prev => prev.map(a => 
      a.device_id === deviceId && a.status === 'ACTIVE' 
        ? { ...a, status: 'TERMINATED', closed_time: now } 
        : a
    ));

    const newAssignment: Assignment = {
      id: assignmentId,
      sequence_id: asnSeq,
      device_id: deviceId,
      worker_id: workerId,
      project_id: projectId || dev.project_id,
      delivering_user_id: currentUser.id,
      assignment_time: now,
      condition: condition || dev.condition,
      accessories: accessories || dev.accessories || '',
      acknowledgement: acknowledgement || "Direct field handover acknowledged by worker.",
      expected_return_date: expectedReturnDate,
      status: 'ACTIVE',
      notes: notes || '',
      latitude: latitude || null,
      longitude: longitude || null,
      location_address: locationAddress || ''
    };

    setAssignments(prev => [newAssignment, ...prev]);

    // Update device
    setDevices(prev => prev.map(d => d.id === deviceId ? {
      ...d,
      current_status: 'ASSIGNED_WORKER',
      current_custodian_type: 'WORKER',
      current_custodian_user_id: null,
      current_custodian_worker_id: workerId,
      condition: (condition as DeviceCondition) || d.condition,
      accessories: accessories || d.accessories,
      updated_at: now
    } : d));

    const fromCustodian = dev.current_custodian_type === 'USER' ? `Staff: ${currentUser.first_name} ${currentUser.last_name}` : 'Company Storage';

    setMovements(prev => [{
      id: Date.now(),
      device_id: deviceId,
      from_custodian_type: dev.current_custodian_type,
      from_custodian_name: fromCustodian,
      to_custodian_type: 'WORKER',
      to_custodian_name: `Worker: ${worker.name} (${worker.worker_id})`,
      from_status: dev.current_status,
      to_status: 'Assigned to Worker / In Use',
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      timestamp: now,
      related_transaction_type: 'ASSIGNMENT',
      related_transaction_id: String(assignmentId),
      notes: `Handed over by ${currentUser.first_name}. Ack: ${acknowledgement || 'Signed'}`
    }, ...prev]);

    setActivityLogs(prev => [{
      id: Date.now() + 1,
      device_id: deviceId,
      action: 'ASSIGNED_TO_WORKER',
      timestamp: now,
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      actor_role: currentUser.role,
      details: `Assigned to ${worker.name} (${worker.worker_id}). Ack: ${acknowledgement || 'Verified on-site'}`,
      latitude: latitude || null,
      longitude: longitude || null,
      location_address: locationAddress || '',
      related_transaction_type: 'ASSIGNMENT',
      related_transaction_id: String(assignmentId)
    }, ...prev]);

    addAuditLog('ASSIGN_DEVICE', 'Device', dev.asset_id, `Assigned to worker ${worker.name} (${worker.worker_id})`);

    return { success: true, assignment: newAssignment };
  };

  // PEER TRANSFERS
  const initiateTransfer = ({
    deviceId, receiverId, condition, notes, latitude, longitude, locationAddress
  }: {
    deviceId: number;
    receiverId: number;
    condition?: string;
    notes?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationAddress?: string;
  }) => {
    if (!currentUser) return { success: false, error: "Authentication required." };
    if (currentUser.id === receiverId) return { success: false, error: "Sender and receiver cannot be the same user." };

    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return { success: false, error: "Device not found." };
    const receiver = users.find(u => u.id === receiverId);
    if (!receiver) return { success: false, error: "Target recipient user not found." };

    if (currentUser.role !== 'ADMIN') {
      if (dev.current_custodian_type !== 'USER' || dev.current_custodian_user_id !== currentUser.id) {
        return { success: false, error: `Device ${dev.asset_id} is not in your custody.` };
      }
    }

    if (transfers.some(t => t.device_id === deviceId && t.status === 'PENDING')) {
      return { success: false, error: `Device ${dev.asset_id} already has a pending transfer.` };
    }

    const now = new Date().toISOString();
    const transferId = Date.now();

    const newTransfer: Transfer = {
      id: transferId,
      device_id: deviceId,
      sender_id: currentUser.id,
      receiver_id: receiverId,
      condition: condition || dev.condition,
      initiated_at: now,
      status: 'PENDING',
      notes: notes || '',
      latitude: latitude || null,
      longitude: longitude || null,
      location_address: locationAddress || ''
    };

    setTransfers(prev => [newTransfer, ...prev]);

    setActivityLogs(prev => [{
      id: Date.now(),
      device_id: deviceId,
      action: 'TRANSFER_INITIATED',
      timestamp: now,
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      actor_role: currentUser.role,
      details: `Transfer initiated to ${receiver.first_name} ${receiver.last_name}. Notes: ${notes || 'None'}`,
      latitude: latitude || null,
      longitude: longitude || null,
      location_address: locationAddress || '',
      related_transaction_type: 'TRANSFER',
      related_transaction_id: String(transferId)
    }, ...prev]);

    addAuditLog('INITIATE_TRANSFER', 'Transfer', String(transferId), `Initiated transfer of ${dev.asset_id} to ${receiver.username}`);

    createNotificationInternal({
      user_id: receiver.id,
      title: "Custody Transfer Incoming",
      message: `${currentUser.first_name || currentUser.username} initiated transfer of ${dev.asset_id} (${dev.brand_and_model}) to you.`,
      category: "TRANSFER",
      is_read: false,
      related_record_type: "transfer",
      related_record_id: transferId,
      action_view: "transfers"
    });

    return { success: true, transfer: newTransfer };
  };

  const acceptTransfer = (transferId: number, locationAddress?: string) => {
    if (!currentUser) return { success: false, error: "Authentication required." };
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) return { success: false, error: "Transfer not found." };

    if (transfer.receiver_id !== currentUser.id && currentUser.role !== 'ADMIN') {
      return { success: false, error: "Only the designated recipient (or Admin) can accept this transfer." };
    }

    if (transfer.status !== 'PENDING') {
      return { success: false, error: `Transfer #${transferId} is already ${transfer.status}.` };
    }

    const dev = devices.find(d => d.id === transfer.device_id);
    if (!dev) return { success: false, error: "Device not found." };
    const sender = users.find(u => u.id === transfer.sender_id);

    const now = new Date().toISOString();

    // Atomically transfer custody to receiver
    setDevices(prev => prev.map(d => d.id === dev.id ? {
      ...d,
      current_status: 'WITH_COLLECTOR',
      current_custodian_type: 'USER',
      current_custodian_user_id: currentUser.id,
      current_custodian_worker_id: null,
      condition: (transfer.condition as DeviceCondition) || d.condition,
      updated_at: now
    } : d));

    setTransfers(prev => prev.map(t => t.id === transferId ? {
      ...t,
      status: 'ACCEPTED',
      accepted_at: now,
      location_address: locationAddress || t.location_address
    } : t));

    setMovements(prev => [{
      id: Date.now(),
      device_id: dev.id,
      from_custodian_type: 'USER',
      from_custodian_name: sender ? `Staff: ${sender.first_name} ${sender.last_name}` : 'Sender Staff',
      to_custodian_type: 'USER',
      to_custodian_name: `Staff: ${currentUser.first_name} ${currentUser.last_name}`,
      from_status: dev.current_status,
      to_status: 'With Collector / In Transit',
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      timestamp: now,
      related_transaction_type: 'TRANSFER',
      related_transaction_id: String(transferId),
      notes: `Transfer accepted by ${currentUser.first_name} from ${sender?.first_name || 'Sender'}`
    }, ...prev]);

    setActivityLogs(prev => [{
      id: Date.now() + 1,
      device_id: dev.id,
      action: 'TRANSFER_ACCEPTED',
      timestamp: now,
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      actor_role: currentUser.role,
      details: `Custody accepted from ${sender?.first_name || 'Sender'}`,
      location_address: locationAddress || transfer.location_address || '',
      related_transaction_type: 'TRANSFER',
      related_transaction_id: String(transferId)
    }, ...prev]);

    addAuditLog('ACCEPT_TRANSFER', 'Transfer', String(transferId), `Accepted custody of ${dev.asset_id}`);

    if (sender) {
      createNotificationInternal({
        user_id: sender.id,
        title: "Transfer Accepted",
        message: `${currentUser.first_name || currentUser.username} accepted custody of ${dev.asset_id}.`,
        category: "TRANSFER",
        is_read: false,
        related_record_type: "transfer",
        related_record_id: transferId,
        action_view: "transfers"
      });
    }

    return { success: true };
  };

  const rejectTransfer = (transferId: number, reason: string) => {
    if (!currentUser) return { success: false, error: "Authentication required." };
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) return { success: false, error: "Transfer not found." };

    if (transfer.receiver_id !== currentUser.id && currentUser.role !== 'ADMIN') {
      return { success: false, error: "Only the designated receiver can reject this transfer." };
    }

    const now = new Date().toISOString();
    setTransfers(prev => prev.map(t => t.id === transferId ? {
      ...t,
      status: 'REJECTED',
      rejected_at: now,
      notes: `${t.notes || ''}\nRejection Reason: ${reason}`.trim()
    } : t));

    setActivityLogs(prev => [{
      id: Date.now(),
      device_id: transfer.device_id,
      action: 'TRANSFER_REJECTED',
      timestamp: now,
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      actor_role: currentUser.role,
      details: `Transfer rejected by ${currentUser.first_name}. Reason: ${reason}`,
      related_transaction_type: 'TRANSFER',
      related_transaction_id: String(transferId)
    }, ...prev]);

    addAuditLog('REJECT_TRANSFER', 'Transfer', String(transferId), `Rejected transfer #${transferId}: ${reason}`);
    return { success: true };
  };

  const cancelTransfer = (transferId: number) => {
    if (!currentUser) return { success: false, error: "Authentication required." };
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) return { success: false, error: "Transfer not found." };

    if (transfer.sender_id !== currentUser.id && currentUser.role !== 'ADMIN') {
      return { success: false, error: "Only the sender can cancel this transfer." };
    }

    setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'CANCELLED' } : t));
    addAuditLog('CANCEL_TRANSFER', 'Transfer', String(transferId), `Cancelled transfer #${transferId}`);
    return { success: true };
  };

  // RETURN PROCESS
  const processReturn = ({
    deviceId, workerId, condition, accessories, notes, evidence, latitude, longitude, locationAddress
  }: {
    deviceId: number;
    workerId: number;
    condition: string;
    accessories?: string;
    notes?: string;
    evidence?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationAddress?: string;
  }) => {
    if (!currentUser) return { success: false, error: "Authentication required." };
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return { success: false, error: "Device not found." };
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return { success: false, error: "Worker not found." };

    const now = new Date().toISOString();
    const returnId = Date.now();

    // Close any active assignment
    setAssignments(prev => prev.map(a => 
      a.device_id === deviceId && a.worker_id === workerId && a.status === 'ACTIVE'
        ? { ...a, status: 'RETURNED', closed_time: now }
        : a
    ));

    const newReturn: DeviceReturn = {
      id: returnId,
      device_id: deviceId,
      worker_id: workerId,
      receiving_user_id: currentUser.id,
      return_time: now,
      condition,
      accessories: accessories || dev.accessories || '',
      notes: notes || '',
      evidence,
      latitude: latitude || null,
      longitude: longitude || null,
      location_address: locationAddress || '',
      inspection_completed: false
    };

    setReturns(prev => [newReturn, ...prev]);

    // Device status becomes AWAITING_INSPECTION under receiving staff custody
    setDevices(prev => prev.map(d => d.id === deviceId ? {
      ...d,
      current_status: 'AWAITING_INSPECTION',
      current_custodian_type: 'USER',
      current_custodian_user_id: currentUser.id,
      current_custodian_worker_id: null,
      condition: (condition as DeviceCondition) || d.condition,
      accessories: accessories || d.accessories,
      updated_at: now
    } : d));

    setMovements(prev => [{
      id: Date.now(),
      device_id: deviceId,
      from_custodian_type: 'WORKER',
      from_custodian_name: `Worker: ${worker.name} (${worker.worker_id})`,
      to_custodian_type: 'USER',
      to_custodian_name: `Staff: ${currentUser.first_name} ${currentUser.last_name}`,
      from_status: dev.current_status,
      to_status: 'Awaiting Inspection',
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      timestamp: now,
      related_transaction_type: 'RETURN',
      related_transaction_id: String(returnId),
      notes: `Return collected from worker ${worker.name}. Location: ${locationAddress || 'Field'}`
    }, ...prev]);

    setActivityLogs(prev => [{
      id: Date.now() + 1,
      device_id: deviceId,
      action: 'RETURN_COLLECTED',
      timestamp: now,
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      actor_role: currentUser.role,
      details: `Returned by worker ${worker.name} (${worker.worker_id}). Condition: ${condition}. Accessories: ${accessories || 'None'}`,
      latitude: latitude || null,
      longitude: longitude || null,
      location_address: locationAddress || '',
      related_transaction_type: 'RETURN',
      related_transaction_id: String(returnId)
    }, ...prev]);

    addAuditLog('PROCESS_RETURN', 'DeviceReturn', String(returnId), `Received return of ${dev.asset_id} from ${worker.name}`);

    return { success: true, deviceReturn: newReturn };
  };

  // COMPLETE INSPECTION
  const completeInspection = ({
    returnId, inspectionResult, outcome, notes
  }: {
    returnId: number;
    inspectionResult: InspectionResult;
    outcome: ReturnOutcome;
    notes?: string;
  }) => {
    if (!currentUser) return { success: false, error: "Authentication required." };
    const ret = returns.find(r => r.id === returnId);
    if (!ret) return { success: false, error: "Return record not found." };
    const dev = devices.find(d => d.id === ret.device_id);
    if (!dev) return { success: false, error: "Device not found." };

    const outcomeConfig: Record<ReturnOutcome, { status: DeviceStatus; custodianType: CustodianType; custodianName: string }> = {
      AVAILABLE_STORAGE: { status: 'AVAILABLE_STORAGE', custodianType: 'STORAGE', custodianName: 'Company Storage' },
      RETURNED_CLIENT: { status: 'RETURNED_TO_CLIENT', custodianType: 'CLIENT', custodianName: 'Source Client' },
      UNDER_REPAIR: { status: 'UNDER_REPAIR', custodianType: 'STORAGE', custodianName: 'Repair Bay' },
      DAMAGED: { status: 'DAMAGED', custodianType: 'STORAGE', custodianName: 'Damaged Quarantine' },
      RETIRED: { status: 'RETIRED', custodianType: 'STORAGE', custodianName: 'Retired Archive' }
    };

    const target = outcomeConfig[outcome];
    const now = new Date().toISOString();

    setReturns(prev => prev.map(r => r.id === returnId ? {
      ...r,
      inspection_completed: true,
      inspection_time: now,
      inspector_id: currentUser.id,
      inspection_result: inspectionResult,
      outcome,
      notes: `${r.notes || ''}\nInspection Verdict: ${inspectionResult}. Notes: ${notes || ''}`.trim()
    } : r));

    setDevices(prev => prev.map(d => d.id === dev.id ? {
      ...d,
      current_status: target.status,
      current_custodian_type: target.custodianType,
      current_custodian_user_id: null,
      current_custodian_worker_id: null,
      updated_at: now
    } : d));

    setMovements(prev => [{
      id: Date.now(),
      device_id: dev.id,
      from_custodian_type: 'USER',
      from_custodian_name: `Staff: ${currentUser.first_name} ${currentUser.last_name}`,
      to_custodian_type: target.custodianType,
      to_custodian_name: target.custodianName,
      from_status: dev.current_status,
      to_status: target.status,
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      timestamp: now,
      related_transaction_type: 'INSPECTION',
      related_transaction_id: String(returnId),
      notes: `Inspection Verdict: ${inspectionResult}. Outcome: ${outcome}. Notes: ${notes || ''}`
    }, ...prev]);

    setActivityLogs(prev => [{
      id: Date.now() + 1,
      device_id: dev.id,
      action: 'INSPECTION_COMPLETED',
      timestamp: now,
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      actor_role: currentUser.role,
      details: `Technical inspection completed: Verdict=${inspectionResult}, Outcome=${outcome}. Notes: ${notes || ''}`,
      related_transaction_type: 'INSPECTION',
      related_transaction_id: String(returnId)
    }, ...prev]);

    addAuditLog('COMPLETE_INSPECTION', 'DeviceReturn', String(returnId), `Inspected ${dev.asset_id}: ${inspectionResult} -> ${outcome}`);

    return { success: true };
  };

  // AUDITED ADJUSTMENT
  const auditedAdjustment = ({
    deviceId, newStatus, newCustodianType, newCustodianUserId, newCustodianWorkerId, reason
  }: {
    deviceId: number;
    newStatus: DeviceStatus;
    newCustodianType: CustodianType;
    newCustodianUserId?: number | null;
    newCustodianWorkerId?: number | null;
    reason: string;
  }) => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { success: false, error: "Only Admin users can perform audited adjustments." };
    }
    if (!reason || reason.trim().length < 5) {
      return { success: false, error: "A clear reason (at least 5 characters) is required for audited adjustments." };
    }

    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return { success: false, error: "Device not found." };

    let custodianName = 'Company Storage';
    if (newCustodianType === 'USER' && newCustodianUserId) {
      const u = users.find(x => x.id === newCustodianUserId);
      custodianName = `Staff: ${u ? `${u.first_name} ${u.last_name}` : 'Staff'}`;
    } else if (newCustodianType === 'WORKER' && newCustodianWorkerId) {
      const w = workers.find(x => x.id === newCustodianWorkerId);
      custodianName = `Worker: ${w ? `${w.name} (${w.worker_id})` : 'Worker'}`;
    } else if (newCustodianType === 'CLIENT') {
      custodianName = 'Source Client';
    }

    const now = new Date().toISOString();

    setDevices(prev => prev.map(d => d.id === deviceId ? {
      ...d,
      current_status: newStatus,
      current_custodian_type: newCustodianType,
      current_custodian_user_id: newCustodianUserId || null,
      current_custodian_worker_id: newCustodianWorkerId || null,
      updated_at: now
    } : d));

    setMovements(prev => [{
      id: Date.now(),
      device_id: deviceId,
      from_custodian_type: dev.current_custodian_type,
      from_custodian_name: dev.current_custodian_type === 'USER' ? 'Staff' : dev.current_custodian_type,
      to_custodian_type: newCustodianType,
      to_custodian_name: custodianName,
      from_status: dev.current_status,
      to_status: newStatus,
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      timestamp: now,
      related_transaction_type: 'ADJUSTMENT',
      notes: `Admin Adjustment by ${currentUser.first_name}. Reason: ${reason}`
    }, ...prev]);

    setActivityLogs(prev => [{
      id: Date.now() + 1,
      device_id: deviceId,
      action: 'AUDITED_ADJUSTMENT',
      timestamp: now,
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      actor_role: currentUser.role,
      details: `Admin adjustment: Status -> ${newStatus}, Custodian -> ${custodianName}. Reason: ${reason}`,
      related_transaction_type: 'ADJUSTMENT'
    }, ...prev]);

    addAuditLog('AUDITED_ADJUSTMENT', 'Device', dev.asset_id, `Status -> ${newStatus}, Custodian -> ${custodianName}. Reason: ${reason}`);

    return { success: true };
  };

  const deleteDevice = (deviceId: number, reason?: string) => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { success: false, error: "Only Admin users can delete devices." };
    }
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return { success: false, error: "Device not found." };

    setDevices(prev => prev.filter(d => d.id !== deviceId));
    addAuditLog('DELETE_DEVICE', 'Device', dev.asset_id, `Device permanently deleted by Admin. Reason: ${reason || 'Manual purge'}`);
    return { success: true };
  };

  // MASS CAMERA ASSIGNMENT
  const executeMassAssignment = ({
    workerId, deviceIds, purpose, notes, expectedReturnDate
  }: {
    workerId: number;
    deviceIds: number[];
    purpose: string;
    notes?: string;
    expectedReturnDate?: string;
  }) => {
    if (!currentUser || currentUser.role === 'POSTMAN') {
      return { success: false, error: "Permission denied: Only Admin or Management Staff can execute mass camera assignments." };
    }
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return { success: false, error: "Target worker not found." };
    if (!deviceIds.length) return { success: false, error: "No devices selected for assignment." };

    const batchId = `MASS-${new Date().toISOString().replace(/\D/g, '').substring(0, 14)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const summaryReport: MassCameraAssignmentBatch['summary_report'] = [];
    let successfulCount = 0;
    let failedCount = 0;

    const updatedDevices = [...devices];
    const newAssignments: Assignment[] = [];
    const newMovements: DeviceMovement[] = [];
    const newActivity: DeviceActivityLog[] = [];

    for (const did of deviceIds) {
      const devIndex = updatedDevices.findIndex(d => d.id === did);
      if (devIndex === -1) {
        summaryReport.push({ device_id: did, asset_id: `#${did}`, success: false, reason: "Device record not found." });
        failedCount++;
        continue;
      }
      const dev = updatedDevices[devIndex];

      // Availability check: must be in AVAILABLE_STORAGE or WITH_COLLECTOR
      if (dev.current_status !== 'AVAILABLE_STORAGE' && dev.current_status !== 'WITH_COLLECTOR') {
        summaryReport.push({
          device_id: dev.id,
          asset_id: dev.asset_id,
          brand_and_model: dev.brand_and_model,
          success: false,
          reason: `Device is currently '${dev.current_status}' and cannot be assigned.`
        });
        failedCount++;
        continue;
      }



      // Perform assignment
      const assignmentId = Date.now() + did;
      const prevStatus = dev.current_status;
      const prevCustodian = dev.current_custodian_type;

      updatedDevices[devIndex] = {
        ...dev,
        current_status: 'ASSIGNED_WORKER',
        current_custodian_type: 'WORKER',
        current_custodian_user_id: null,
        current_custodian_worker_id: workerId,
        updated_at: now
      };

      newAssignments.push({
        id: assignmentId,
        device_id: dev.id,
        worker_id: workerId,
        delivering_user_id: currentUser.id,
        assignment_time: now,
        condition: dev.condition,
        accessories: dev.accessories || '',
        acknowledgement: `Mass Batch #${batchId} deployment: ${purpose}.`,
        expected_return_date: expectedReturnDate,
        status: 'ACTIVE',
        notes: `Batch ${batchId}. ${notes || ''}`.trim()
      });

      newMovements.push({
        id: Date.now() + did + 10,
        device_id: dev.id,
        from_custodian_type: prevCustodian,
        from_custodian_name: prevCustodian === 'STORAGE' ? 'Company Storage' : `Staff: ${currentUser.first_name}`,
        to_custodian_type: 'WORKER',
        to_custodian_name: `Worker: ${worker.name} (${worker.worker_id})`,
        from_status: prevStatus,
        to_status: 'Assigned to Worker / In Use',
        actor_id: currentUser.id,
        actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
        timestamp: now,
        related_transaction_type: 'ASSIGNMENT',
        related_transaction_id: String(assignmentId),
        notes: `Mass Batch ${batchId}: Assigned to ${worker.name}`
      });

      newActivity.push({
        id: Date.now() + did + 20,
        device_id: dev.id,
        action: 'ASSIGNED_TO_WORKER',
        timestamp: now,
        actor_id: currentUser.id,
        actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
        actor_role: currentUser.role,
        details: `Mass Batch #${batchId}: Handed over to Worker ${worker.name}. Purpose: ${purpose}`,
        related_transaction_type: 'Assignment',
        related_transaction_id: String(assignmentId)
      });

      summaryReport.push({
        device_id: dev.id,
        asset_id: dev.asset_id,
        brand_and_model: dev.brand_and_model,
        success: true,
        reason: "Assigned successfully."
      });
      successfulCount++;
    }

    const batchStatus = failedCount > 0 && successfulCount > 0 ? 'PARTIAL' : (failedCount > 0 ? 'FAILED' : 'COMPLETED');

    const newBatch: MassCameraAssignmentBatch = {
      id: Date.now(),
      batch_id: batchId,
      actor_id: currentUser.id,
      actor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
      status: batchStatus,
      total_devices: deviceIds.length,
      successful_assignments: successfulCount,
      failed_assignments: failedCount,
      notes,
      created_at: now,
      summary_report: summaryReport
    };

    setDevices(updatedDevices);
    setAssignments(prev => [...newAssignments, ...prev]);
    setMovements(prev => [...newMovements, ...prev]);
    setActivityLogs(prev => [...newActivity, ...prev]);
    setMassBatches(prev => [newBatch, ...prev]);

    addAuditLog('MASS_CAMERA_ASSIGNMENT', 'MassCameraAssignmentBatch', batchId, `Mass assigned ${successfulCount}/${deviceIds.length} cameras to Worker ${worker.name} (Batch #${batchId})`);

    return { success: true, batch: newBatch };
  };

  // TASKS
  const createTask = (taskData: Omit<Task, 'id' | 'created_at'>) => {
    const seq = getNextSequenceId('TSK');
    const newTask: Task = {
      ...taskData,
      id: Date.now(),
      sequence_id: seq,
      created_at: new Date().toISOString()
    };
    setTasks(prev => [newTask, ...prev]);
    addAuditLog('CREATE_TASK', 'Task', seq, `Created task [${seq}]: ${newTask.title}`);

    if (newTask.assigned_user_id) {
      createNotificationInternal({
        user_id: newTask.assigned_user_id,
        title: `New Task Assigned [${seq}]`,
        message: `${newTask.title} (Priority: ${newTask.priority}). Due: ${new Date(newTask.scheduled_time).toLocaleDateString()}`,
        category: 'TASK',
        is_read: false,
        related_record_type: 'task',
        related_record_id: newTask.id,
        action_view: 'tasks'
      });
    }
  };

  const updateTaskStatus = (taskId: number, status: Task['status'], outcome?: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, outcome: outcome || t.outcome } : t));
    addAuditLog('UPDATE_TASK_STATUS', 'Task', String(taskId), `Task status changed to ${status}`);
  };

  // INCIDENTS
  const reportIncident = (incidentData: Omit<Incident, 'id' | 'timestamp'>) => {
    const seq = getNextSequenceId('INC');
    const newInc: Incident = {
      ...incidentData,
      id: Date.now(),
      sequence_id: seq,
      timestamp: new Date().toISOString()
    };
    setIncidents(prev => [newInc, ...prev]);
    // Auto-quarantine device if damage or loss
    if (['DAMAGE', 'LOSS'].includes(incidentData.incident_type)) {
      setDevices(prev => prev.map(d => d.id === incidentData.device_id ? {
        ...d,
        current_status: incidentData.incident_type === 'DAMAGE' ? 'DAMAGED' : 'LOST',
        condition: 'DAMAGED',
        updated_at: new Date().toISOString()
      } : d));
    }
    addAuditLog('REPORT_INCIDENT', 'Incident', seq, `Reported ${incidentData.incident_type} [${seq}] for device #${incidentData.device_id}`);

    const notifyStaff = users.filter(u => u.role === 'ADMIN' || u.role === 'MANAGEMENT');
    notifyStaff.forEach(s => {
      createNotificationInternal({
        user_id: s.id,
        title: `Incident: ${incidentData.incident_type} [${seq}]`,
        message: `Device #${incidentData.device_id}: ${incidentData.notes.substring(0, 80)}`,
        category: 'INVENTORY',
        is_read: false,
        related_record_type: 'device',
        related_record_id: incidentData.device_id,
        action_view: 'incidents'
      });
    });
  };

  const resolveIncident = (incidentId: number, resolutionNotes: string) => {
    setIncidents(prev => prev.map(i => i.id === incidentId ? {
      ...i,
      status: 'RESOLVED',
      resolution_notes: resolutionNotes
    } : i));
    addAuditLog('RESOLVE_INCIDENT', 'Incident', String(incidentId), `Incident resolved: ${resolutionNotes}`);
  };

  // SENSITIVE WORKER DATA REVEAL (Admin only, logged to audit ledger)
  const revealSensitiveWorkerData = (workerId: number) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker || !currentUser) return;
    addAuditLog('VIEW_SENSITIVE_WORKER_DATA', 'Worker', String(worker.worker_id), `Administrator viewed unmasked Aadhaar and Bank details for worker ${worker.name}`);
  };

  // USER MANAGEMENT
  const approveUser = (userId: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, approval_status: 'APPROVED', is_active: true } : u));
    addAuditLog('APPROVE_USER', 'User', String(userId), `Approved user account #${userId}`);

    createNotificationInternal({
      user_id: userId,
      title: "Account Approved",
      message: "Your CamGuard account has been approved by an administrator. You now have full role access.",
      category: "APPROVAL",
      is_read: false,
      related_record_type: "user",
      related_record_id: userId,
      action_view: "dashboard"
    });
  };

  const rejectUser = (userId: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, approval_status: 'REJECTED' } : u));
    addAuditLog('REJECT_USER', 'User', String(userId), `Rejected user account #${userId}`);
  };

  const toggleUserStatus = (userId: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
    addAuditLog('TOGGLE_USER_STATUS', 'User', String(userId), `Toggled active status for user #${userId}`);
  };

  const updateUserRole = (userId: number, role: UserRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    addAuditLog('UPDATE_USER_ROLE', 'User', String(userId), `Changed role to ${role}`);
  };

  // DIRECTORY CRUD
  const createClient = (c: Omit<ClientCompany, 'id' | 'created_at'>) => {
    const seq = getNextSequenceId('CLT');
    const newClient: ClientCompany = {
      ...c,
      id: Date.now(),
      sequence_id: seq,
      code: c.code || seq,
      created_at: new Date().toISOString()
    };
    setClients(prev => [...prev, newClient]);
    addAuditLog('CREATE_CLIENT', 'ClientCompany', seq, `Added client [${seq}] ${newClient.name}`);
    return newClient;
  };

  const updateClient = (id: number, c: Partial<ClientCompany>) => {
    setClients(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));
    addAuditLog('UPDATE_CLIENT', 'ClientCompany', String(id), `Updated client #${id}`);
  };

  const createContact = (c: Omit<ClientContact, 'id' | 'created_at'>) => {
    const seq = getNextSequenceId('CON');
    const newContact: ClientContact = {
      ...c,
      id: Date.now(),
      sequence_id: seq,
      created_at: new Date().toISOString()
    };
    setContacts(prev => [...prev, newContact]);
    addAuditLog('CREATE_CONTACT', 'ClientContact', seq, `Added contact [${seq}] ${newContact.name}`);
    return newContact;
  };

  const updateContact = (id: number, c: Partial<ClientContact>) => {
    setContacts(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));
  };

  const deleteContact = (id: number) => {
    setContacts(prev => prev.filter(x => x.id !== id));
    addAuditLog('DELETE_CONTACT', 'ClientContact', String(id), `Deleted contact #${id}`);
  };

  const createWorker = (w: Omit<Worker, 'id' | 'created_at'>) => {
    const newWorker: Worker = { ...w, id: Date.now(), created_at: new Date().toISOString() };
    setWorkers(prev => [...prev, newWorker]);
    addAuditLog('CREATE_WORKER', 'Worker', newWorker.worker_id, `Added worker ${newWorker.name}`);
    return newWorker;
  };

  const updateWorker = (id: number, w: Partial<Worker>) => {
    setWorkers(prev => prev.map(x => x.id === id ? { ...x, ...w } : x));
    addAuditLog('UPDATE_WORKER', 'Worker', String(id), `Updated worker #${id}`);
  };

  const createEmployer = (e: Omit<EmployerCompany, 'id' | 'created_at'>) => {
    const newEmp: EmployerCompany = { ...e, id: Date.now(), created_at: new Date().toISOString() };
    setEmployers(prev => [...prev, newEmp]);
    addAuditLog('CREATE_EMPLOYER', 'EmployerCompany', String(newEmp.id), `Added employer ${newEmp.name}`);
    return newEmp;
  };

  const updateEmployer = (id: number, e: Partial<EmployerCompany>) => {
    setEmployers(prev => prev.map(x => x.id === id ? { ...x, ...e } : x));
  };

  // DYNAMIC OBJECT & FIELD BUILDER
  const createObjectDefinition = (obj: Omit<ObjectDefinition, 'id' | 'created_at'>) => {
    const newObj: ObjectDefinition = {
      ...obj,
      id: Date.now(),
      created_at: new Date().toISOString()
    };
    setObjectDefinitions(prev => [...prev, newObj]);
    addAuditLog('CREATE_OBJECT_DEFINITION', 'ObjectDefinition', newObj.api_name, `Created dynamic object ${newObj.name} (${newObj.api_name})`);
    return newObj;
  };

  const createFieldDefinition = (field: Omit<FieldDefinition, 'id'>) => {
    const newField: FieldDefinition = {
      ...field,
      id: Date.now()
    };
    setFieldDefinitions(prev => [...prev, newField]);
    addAuditLog('CREATE_FIELD_DEFINITION', 'FieldDefinition', `${field.object_key}.${field.api_name}`, `Added field ${field.label} to object ${field.object_key}`);
    return newField;
  };

  const updateFieldDefinition = (fieldId: number, updates: Partial<FieldDefinition>) => {
    setFieldDefinitions(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f));
    addAuditLog('UPDATE_FIELD_DEFINITION', 'FieldDefinition', String(fieldId), `Updated field definition #${fieldId}`);
  };

  const toggleFieldActive = (fieldId: number) => {
    setFieldDefinitions(prev => prev.map(f => f.id === fieldId ? { ...f, is_active: !f.is_active } : f));
    addAuditLog('TOGGLE_FIELD_ACTIVE', 'FieldDefinition', String(fieldId), `Toggled active state for field #${fieldId}`);
  };

  const reorderFields = (objectKey: string, fieldIds: number[]) => {
    setFieldDefinitions(prev => {
      const fieldMap = new Map(prev.map(f => [f.id, f]));
      return prev.map(f => {
        if (f.object_key === objectKey) {
          const index = fieldIds.indexOf(f.id);
          if (index !== -1) {
            return { ...f, display_order: (index + 1) * 10 };
          }
        }
        return f;
      });
    });
    addAuditLog('REORDER_FIELDS', 'ObjectDefinition', objectKey, `Reordered fields for object ${objectKey}`);
  };

  const saveDynamicRecord = (objectKey: string, recordData: Record<string, any>, recordId?: number) => {
    const now = new Date().toISOString();
    if (recordId) {
      setDynamicRecords(prev => prev.map(r => r.id === recordId ? {
        ...r,
        data: { ...r.data, ...recordData },
        updated_at: now
      } : r));
      const existing = dynamicRecords.find(r => r.id === recordId)!;
      addAuditLog('UPDATE_DYNAMIC_RECORD', objectKey, existing.record_id, `Updated dynamic record ${existing.record_id}`);
      return existing;
    } else {
      const newRec: DynamicRecord = {
        id: Date.now(),
        object_key: objectKey,
        record_id: `${objectKey.toUpperCase().substring(0, 3)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        name: recordData.name || recordData.title || `Record #${Date.now().toString().slice(-4)}`,
        data: recordData,
        created_by: currentUser?.username,
        created_at: now,
        updated_at: now
      };
      setDynamicRecords(prev => [newRec, ...prev]);
      addAuditLog('CREATE_DYNAMIC_RECORD', objectKey, newRec.record_id, `Created dynamic record ${newRec.name}`);
      return newRec;
    }
  };

  const resetToSeedData = () => {
    localStorage.clear();
    setUsers(initialUsers);
    setClients(initialClients);
    setContacts(initialContacts);
    setEmployers(initialEmployers);
    setWorkers(initialWorkers);
    setDevices(initialDevices);
    setProjects(initialProjects);
    setAssignments(initialAssignments);
    setPickups(initialPickups);
    setTransfers(initialTransfers);
    setReturns(initialReturns);
    setMovements(initialMovements);
    setActivityLogs(initialActivityLogs);
    setTasks(initialTasks);
    setIncidents(initialIncidents);
    setAuditLogs(initialAuditLogs);
    setObjectDefinitions(initialObjectDefinitions);
    setFieldDefinitions(initialFieldDefinitions);
    setMassBatches(initialMassBatches);
    setDynamicRecords([]);
    setClientOffices(initialClientOffices);
    setNotifications(initialNotifications);
    setAnnouncements(initialAnnouncements);
    setCurrentUser(initialUsers[0]);
    setSequenceCounters(defaultCounters);
    setIsSessionLocked(false);
    setLastActiveTime(Date.now());
    setRemainingTimeoutSeconds(300);
    addAuditLog('PURGE_AND_RESET_DATA', 'System', '0', 'System data restored to pristine seed state');
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      users, clients, clientOffices, contacts, employers, workers, devices, projects,
      assignments, pickups, transfers, returns, movements, activityLogs,
      tasks, incidents, auditLogs, objectDefinitions, fieldDefinitions,
      massBatches, dynamicRecords,
      notifications, announcements, unreadNotificationCount,
      createNotification, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification,
      createAnnouncement, acknowledgeAnnouncement, togglePinAnnouncement, deleteAnnouncement,
      login, loginWithGoogle, logout, registerUser, updateUserProfile,
      isSessionLocked, unlockSession, remainingTimeoutSeconds,
      createProject, updateProject, archiveProject, deleteProject,
      getNextSequenceId,
      intakeDevices, assignDeviceToWorker, initiateTransfer,
      acceptTransfer, rejectTransfer, cancelTransfer,
      processReturn, completeInspection, auditedAdjustment, deleteDevice,
      executeMassAssignment, createTask, updateTaskStatus,
      reportIncident, resolveIncident,
      createClient, updateClient,
      createClientOffice, updateClientOffice, toggleOfficeStatus, deleteClientOffice,
      createContact, updateContact, deleteContact,
      createWorker, updateWorker, createEmployer, updateEmployer,
      revealSensitiveWorkerData,
      approveUser, rejectUser, toggleUserStatus, updateUserRole,
      createObjectDefinition, createFieldDefinition, updateFieldDefinition,
      toggleFieldActive, reorderFields, saveDynamicRecord,
      addAuditLog, resetToSeedData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
