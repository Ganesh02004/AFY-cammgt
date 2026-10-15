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

const RTDB_ROOT = 'app_state_v2';

/**
 * Persists an entire collection or full state branch to Firebase Realtime Database.
 */
export async function syncCollectionToDatabase(collectionName: string, data: any): Promise<boolean> {
  try {
    const dbRef = ref(db, `${RTDB_ROOT}/${collectionName}`);
    await set(dbRef, data);
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
      return snapshot.val() as DatabaseSyncState;
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
          const remoteData = snapshot.val();
          if (remoteData && typeof remoteData === 'object') {
            onDataChange(remoteData);
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
