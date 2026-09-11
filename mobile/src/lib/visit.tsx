import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import * as api from './api';
import { uid } from './format';
import type {
  ActiveVisit,
  Delivery,
  Gps,
  LocalPhoto,
  Order,
  PhotoKind,
  Store,
  Task,
} from './types';

const KEY_ACTIVE = 'kylastusgraafik.activeVisit';
const KEY_QUEUE = 'kylastusgraafik.syncQueue';

type Ctx = {
  active: ActiveVisit | null;
  queue: ActiveVisit[];
  syncing: boolean;
  lastSyncError: string | null;

  checkIn: (store: Store) => Promise<void>;
  checkOut: () => Promise<{ synced: boolean; error?: string }>;
  discard: () => Promise<void>;

  setNotes: (notes: string) => void;
  addPhoto: (kind: PhotoKind, uri: string, width: number, height: number, thumbUri: string) => void;
  removePhoto: (id: string) => void;
  addTask: (text: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  addOrder: (o: Omit<Order, 'id'>) => void;
  removeOrder: (id: string) => void;
  addDelivery: (d: Omit<Delivery, 'id'>) => void;
  removeDelivery: (id: string) => void;

  syncNow: () => Promise<void>;
};

const VisitCtx = createContext<Ctx | null>(null);

async function readGps(): Promise<Gps | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? 0,
    };
  } catch {
    // GPS is best-effort: a visit in a basement stockroom must still record.
    return null;
  }
}

export function VisitProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveVisit | null>(null);
  const [queue, setQueue] = useState<ActiveVisit[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const busy = useRef(false);

  // ── persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [a, q] = await Promise.all([
        AsyncStorage.getItem(KEY_ACTIVE),
        AsyncStorage.getItem(KEY_QUEUE),
      ]);
      if (a) setActive(JSON.parse(a));
      if (q) setQueue(JSON.parse(q));
    })();
  }, []);

  const persistActive = useCallback(async (v: ActiveVisit | null) => {
    setActive(v);
    if (v) await AsyncStorage.setItem(KEY_ACTIVE, JSON.stringify(v));
    else await AsyncStorage.removeItem(KEY_ACTIVE);
  }, []);

  const persistQueue = useCallback(async (q: ActiveVisit[]) => {
    setQueue(q);
    await AsyncStorage.setItem(KEY_QUEUE, JSON.stringify(q));
  }, []);

  /** Every mutation runs through here so nothing can be lost to a crash. */
  const patch = useCallback(
    (fn: (v: ActiveVisit) => ActiveVisit) => {
      setActive((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        AsyncStorage.setItem(KEY_ACTIVE, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  // ── sync ──────────────────────────────────────────────────────────────────
  const uploadOne = useCallback(async (visit: ActiveVisit) => {
    // Photos first: the visit row must exist before photos can attach to it,
    // so push a shell record, then the files, then the full payload.
    const payload = {
      id: visit.id,
      storeId: visit.storeId,
      status: visit.status,
      notes: visit.notes,
      checkIn: visit.checkIn,
      checkOut: visit.checkOut,
      tasks: visit.tasks,
      orders: visit.orders,
      deliveries: visit.deliveries,
    };
    await api.syncVisit(payload);

    for (const photo of visit.photos) {
      if (photo.remoteId) continue;
      const { photo: uploaded } = await api.uploadPhoto(visit.id, photo, photo.thumbUri);
      photo.remoteId = uploaded.id;
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (busy.current) return;
    const pending = await AsyncStorage.getItem(KEY_QUEUE);
    const list: ActiveVisit[] = pending ? JSON.parse(pending) : [];
    if (!list.length) {
      setLastSyncError(null);
      return;
    }
    if (!api.getToken() || !api.getServerUrl()) return;

    busy.current = true;
    setSyncing(true);
    const remaining: ActiveVisit[] = [];
    let firstError: string | null = null;

    for (const visit of list) {
      try {
        await uploadOne(visit);
      } catch (err: any) {
        firstError = firstError ?? (err?.message || 'Sünkroonimine ebaõnnestus');
        remaining.push({ ...visit, syncError: err?.message ?? null });
      }
    }

    await persistQueue(remaining);
    setLastSyncError(firstError);
    setSyncing(false);
    busy.current = false;
  }, [persistQueue, uploadOne]);

  // Retry whenever the app comes back to the foreground — the most likely
  // moment for a device to have regained signal.
  useEffect(() => {
    syncNow();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow();
    });
    return () => sub.remove();
  }, [syncNow]);

  // ── lifecycle ─────────────────────────────────────────────────────────────
  const checkIn = useCallback(
    async (store: Store) => {
      const gps = await readGps();
      await persistActive({
        id: uid() + '-' + Math.random().toString(36).slice(2, 8),
        storeId: store.id,
        storeName: store.name,
        status: 'active',
        checkIn: { time: new Date().toISOString(), gps },
        checkOut: null,
        notes: '',
        photos: [],
        tasks: [],
        orders: [],
        deliveries: [],
      });
    },
    [persistActive]
  );

  const checkOut = useCallback(async () => {
    if (!active) return { synced: false, error: 'Aktiivne külastus puudub' };
    const gps = await readGps();
    const finished: ActiveVisit = {
      ...active,
      status: 'completed',
      checkOut: { time: new Date().toISOString(), gps },
    };

    // Clear the active visit immediately — the work is done from the user's
    // point of view even if the upload has to wait for signal.
    await persistActive(null);

    try {
      await uploadOne(finished);
      setLastSyncError(null);
      return { synced: true };
    } catch (err: any) {
      const message = err?.message || 'Sünkroonimine ebaõnnestus';
      const current = await AsyncStorage.getItem(KEY_QUEUE);
      const list: ActiveVisit[] = current ? JSON.parse(current) : [];
      await persistQueue([...list, { ...finished, syncError: message }]);
      setLastSyncError(message);
      return { synced: false, error: message };
    }
  }, [active, persistActive, persistQueue, uploadOne]);

  const discard = useCallback(async () => {
    await persistActive(null);
  }, [persistActive]);

  // ── mutations ─────────────────────────────────────────────────────────────
  const setNotes = useCallback((notes: string) => patch((v) => ({ ...v, notes })), [patch]);

  const addPhoto = useCallback(
    (kind: PhotoKind, uri: string, width: number, height: number, thumbUri: string) => {
      const photo: LocalPhoto = {
        id: uid(),
        kind,
        uri,
        thumbUri,
        width,
        height,
        takenAt: new Date().toISOString(),
      };
      patch((v) => ({ ...v, photos: [...v.photos, photo] }));
    },
    [patch]
  );

  const removePhoto = useCallback(
    (id: string) => patch((v) => ({ ...v, photos: v.photos.filter((p) => p.id !== id) })),
    [patch]
  );

  const addTask = useCallback(
    (text: string) =>
      patch((v) => ({ ...v, tasks: [...v.tasks, { id: uid(), text, done: false } as Task] })),
    [patch]
  );
  const toggleTask = useCallback(
    (id: string) =>
      patch((v) => ({
        ...v,
        tasks: v.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      })),
    [patch]
  );
  const removeTask = useCallback(
    (id: string) => patch((v) => ({ ...v, tasks: v.tasks.filter((t) => t.id !== id) })),
    [patch]
  );

  const addOrder = useCallback(
    (o: Omit<Order, 'id'>) => patch((v) => ({ ...v, orders: [...v.orders, { ...o, id: uid() }] })),
    [patch]
  );
  const removeOrder = useCallback(
    (id: string) => patch((v) => ({ ...v, orders: v.orders.filter((o) => o.id !== id) })),
    [patch]
  );

  const addDelivery = useCallback(
    (d: Omit<Delivery, 'id'>) =>
      patch((v) => ({ ...v, deliveries: [...v.deliveries, { ...d, id: uid() }] })),
    [patch]
  );
  const removeDelivery = useCallback(
    (id: string) => patch((v) => ({ ...v, deliveries: v.deliveries.filter((d) => d.id !== id) })),
    [patch]
  );

  return (
    <VisitCtx.Provider
      value={{
        active,
        queue,
        syncing,
        lastSyncError,
        checkIn,
        checkOut,
        discard,
        setNotes,
        addPhoto,
        removePhoto,
        addTask,
        toggleTask,
        removeTask,
        addOrder,
        removeOrder,
        addDelivery,
        removeDelivery,
        syncNow,
      }}>
      {children}
    </VisitCtx.Provider>
  );
}

export function useVisit() {
  const ctx = useContext(VisitCtx);
  if (!ctx) throw new Error('useVisit must be used inside VisitProvider');
  return ctx;
}
