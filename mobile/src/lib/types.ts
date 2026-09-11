export type Role = 'admin' | 'field';

export type User = { id: string; username: string; name: string; role: Role };

export type Store = {
  id: string;
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  visit_count?: number;
  last_visit?: string | null;
};

export type Gps = { lat: number; lng: number; accuracy: number };

export type Stamp = { time: string; gps: Gps | null };

export type PhotoKind = 'before' | 'after' | 'library';

/** A photo held on the device while the visit is in progress. */
export type LocalPhoto = {
  id: string;
  kind: PhotoKind;
  uri: string;
  /** Pre-scaled copy uploaded alongside the original for the admin gallery. */
  thumbUri: string;
  width: number;
  height: number;
  takenAt: string;
  /** Set once the server has accepted it, so retries do not re-upload. */
  remoteId?: string;
};

export type Task = { id: string; text: string; done: boolean };

export type Order = {
  id: string;
  product: string;
  qty: number;
  unit: string;
  price: number;
  notes?: string;
};

export type DeliveryStatus = 'delivered' | 'partial' | 'rejected';

export type Delivery = {
  id: string;
  product: string;
  qty: number;
  unit: string;
  status: DeliveryStatus;
  notes?: string;
};

/** The visit as the device owns it, before and during sync. */
export type ActiveVisit = {
  id: string;
  storeId: string;
  storeName: string;
  status: 'active' | 'completed';
  checkIn: Stamp;
  checkOut: Stamp | null;
  notes: string;
  photos: LocalPhoto[];
  tasks: Task[];
  orders: Order[];
  deliveries: Delivery[];
  /** Set when check-out happened but the upload has not completed yet. */
  syncError?: string | null;
};

/** A visit summary as the server returns it in a list. */
export type VisitRow = {
  id: string;
  status: string;
  store_name: string;
  user_name: string;
  check_in_time: string;
  check_out_time: string | null;
  photo_count: number;
  order_count: number;
  order_total: number;
  delivery_count: number;
  task_count: number;
  task_done: number;
};

export type RemotePhoto = {
  id: string;
  kind: PhotoKind;
  url: string;
  thumbUrl: string;
  originalName?: string | null;
  size?: number;
  createdAt: string;
};

export type VisitDetail = {
  id: string;
  status: string;
  storeName: string;
  userName: string;
  notes: string;
  checkIn: Stamp | null;
  checkOut: Stamp | null;
  photos: RemotePhoto[];
  tasks: Task[];
  orders: Order[];
  deliveries: Delivery[];
};
