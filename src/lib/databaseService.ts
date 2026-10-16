import { db, ref, set, get, onValue, child } from './firebase';

export interface DatabaseSyncState {
  users?: any[];
  clients?: any[];
  clientOffices?: any[];
  contacts?: any[];
  employers?: any[];
  workers?: any[];
  devices?: any[];
  projects?: any[];
  assignments?: any[];
  pickups?: any[];
  transfers?: any[];
  returns?: any[];
  movements?: any[];
  activityLogs?: any[];
  tasks?: any[];
  incidents?: any[];
  auditLogs?: any[];
  notifications?: any[];
  announcements?: any[];
}

const RTDB_ROOT = 'app_state_v3';

/**
 * Normalizes any collection payload returned by Firebase RTDB into a pure array or null.
 * Handles:
 *  - Enveloped arrays: { items: [...], count: 0, updatedAt: ... }
 *  - Raw arrays: [...]
 *  - Firebase auto-converted object arrays: { "0": {...}, "1": {...} }
 *  - Explicitly empty collections: { count: 0 } -> []
 */
export function parseCollectionData(raw: any): any[] | null {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    if (Array.isArray(raw.items)) return raw.items;
    if (raw.count === 0) return [];
    // If it's an object of numeric keys like { "0": {...}, "1": {...} }
    const keys = Object.keys(raw).filter(k => k !== 'updatedAt' && k !== 'count' && k !== 'items');
    if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
      return keys.sort((a, b) => Number(a) - Number(b)).map(k => raw[k]);
    }
  }
  return null;
}

export function normalizeDatabaseState(rawState: any): DatabaseSyncState {
  if (!rawState || typeof rawState !== 'object') return {};
  const normalized: DatabaseSyncState = {};
  const collections: (keyof DatabaseSyncState)[] = [
    'users', 'clients', 'clientOffices', 'contacts', 'employers', 'workers',
    'devices', 'projects', 'assignments', 'pickups', 'transfers', 'returns',
    'movements', 'activityLogs', 'tasks', 'incidents', 'auditLogs',
    'notifications', 'announcements'
  ];

  for (const col of collections) {
    if (col in rawState) {
      const parsed = parseCollectionData(rawState[col]);
      if (parsed !== null) {
        normalized[col] = parsed;
      }
    }
  }
  return normalized;
}

/**
 * Persists an entire collection or full state branch to Firebase Realtime Database.
 * Wraps arrays in an envelope ({ items, count, updatedAt }) so that empty collections
 * (e.g. after a Purge) are NOT deleted by Firebase RTDB, ensuring cross-session persistence.
 */
export async function syncCollectionToDatabase(collectionName: string, data: any): Promise<boolean> {
  try {
    const dbRef = ref(db, `${RTDB_ROOT}/${collectionName}`);
    const payload = Array.isArray(data)
      ? { items: data, count: data.length, updatedAt: Date.now() }
      : data;
    await set(dbRef, payload);
    return true;
  } catch (err) {
    console.warn(`[Firebase RTDB] Error syncing collection "${collectionName}":`, err);
    return false;
  }
}

/**
 * Fetches the entire application state from Firebase Realtime Database.
 */
export async function fetchDatabaseState(): Promise<DatabaseSyncState | null> {
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, RTDB_ROOT));
    if (snapshot.exists()) {
      return normalizeDatabaseState(snapshot.val());
    }
    return null;
  } catch (err) {
    console.warn('[Firebase RTDB] Failed to fetch remote database state:', err);
    return null;
  }
}

/**
 * Attaches a real-time listener to Firebase RTDB so updates from Admins or other devices
 * sync immediately across all connected clients.
 */
export function subscribeToDatabaseChanges(
  onDataChange: (data: DatabaseSyncState) => void
): () => void {
  try {
    const dbRef = ref(db, RTDB_ROOT);
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.val();
          if (raw && typeof raw === 'object') {
            onDataChange(normalizeDatabaseState(raw));
          }
        }
      },
      (error) => {
        console.warn('[Firebase RTDB] Real-time subscription error:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase RTDB] Could not set up real-time listener:', err);
    return () => {};
  }
}
