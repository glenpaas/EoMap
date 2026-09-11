# Külastusgraafik — Poodide külastustarkvara

Field-visit software for store merchandisers. A rep checks in at a store, shoots
before/after shelf photos, records notes, tasks, orders and deliveries, then checks
out — and the whole visit lands on a server the office can browse.

Three pieces:

| | What it is | Where |
|---|---|---|
| **Mobile app** | Expo / React Native app for iOS + Android. Camera, GPS, works offline. | [mobile/](mobile/) |
| **Backend** | Node + Express + SQLite API, stores photos on disk. | [backend/](backend/) |
| **Admin panel** | Web dashboard — file/photo gallery, visit reports, stores, users. Served by the backend. | [backend/public/](backend/public/) |
| **Original web app** | The single-page prototype this grew from. Still runs standalone off `localStorage`. | [index.html](index.html) |

---

## 1. Start the backend

```bash
cd backend
cp .env.example .env      # then edit JWT_SECRET and ADMIN_PASS
npm install
npm start
```

It prints three addresses:

```
  ├─ Admin:  http://localhost:4000
  ├─ LAN:    http://192.168.1.10:4000   ← use this in the mobile app
  └─ API:    http://localhost:4000/api
```

On first boot it creates the admin account from `.env` (default `admin` / `admin123`)
and seeds six Estonian stores. **Change the password before using this anywhere real.**

Open the Admin address in a browser and log in.

## 2. Start the mobile app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS: Camera app, Android: Expo Go app). The phone and
the computer must be on the same Wi-Fi network.

Log in with just a **username and password** — a user you created in the admin panel under
**Kasutajad**. There is no server address to type: in development the app derives the
backend host from whichever machine is serving the Expo bundle, so it follows your laptop's
LAN IP automatically when you change networks.

To point one device somewhere else, use **Serveri seaded** under the login button (or
**Seaded → Server** once signed in). That choice is stored on the device and overrides the
default. For a real build, set a fixed address once in `mobile/app.json`:

```json
"extra": { "serverUrl": "https://kylastusgraafik.example.com" }
```

> Field staff should get the `Välitöötaja` role. The `Administraator` role is the only
> one that can open the web admin panel.

### Building a real installable app

Expo Go is for development. For an app you can install permanently or ship to a store:

```bash
npm install -g eas-cli
eas login
eas build --platform ios      # or android
```

---

## What the admin panel does

- **Ülevaade** — visit counts, a 30-day activity chart, photo storage used, order totals, top stores, delivery status breakdown.
- **Failid ja pildid** — every photo across every visit in one gallery. Filter by store, user, before/after, date, or free text. Click to open full size with keyboard arrows. Select many and bulk delete. Drag files in to add them to the library.
- **Külastused** — every visit as a table; click any row for the full report (photos, GPS, notes, tasks, orders, deliveries) and export it as CSV.
- **Poed** — add, edit, hide stores. These are what the mobile app offers at check-in.
- **Kasutajad** — create accounts, set roles, reset passwords, deactivate.

Stores and users that already have visit history are **hidden/deactivated** rather than
deleted, so old reports keep their names.

---

## How offline works

The mobile app owns a visit while it is in progress: everything is written to device
storage on every keystroke, so a crash or a dead battery loses nothing.

At check-out the app tries to upload. If there is no signal, the visit joins a queue and
the app retries automatically every time it returns to the foreground. **Kodu** and
**Seaded** both show how many visits are waiting, and **Seaded → Sünkrooni kohe** forces
a retry.

Re-sending a visit is safe: the server keys on the visit's id and replaces its child rows
rather than appending, and photos already accepted are not uploaded twice.

Photos are resized to 1600px and compressed on the phone before upload, and the phone also
generates the thumbnail the gallery uses — so the server needs no native image library.

---

## Architecture notes

**Database** — SQLite via Node's built-in `node:sqlite` (Node 22.5+). No native modules to
compile. The file lives at `backend/data/kylastusgraafik.db`; photos at `backend/uploads/YYYY/MM/`.
Both are gitignored. To back up, copy those two directories.

**Auth** — JWT, 30-day expiry so field staff aren't logged out mid-route. Photos are served
through an authenticated route rather than as static files, so `<img>` tags pass the token
in the query string.

**Permissions** — field users only ever see their own visits and photos, enforced in the
query, not the UI. Admins see everything.

### API

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/auth/login` | → `{ token, user }` |
| `GET` | `/api/auth/me` | |
| `POST` | `/api/auth/password` | change own password |
| `GET` | `/api/stores` | `?all=1` includes hidden (admin) |
| `POST` `PATCH` `DELETE` | `/api/stores/:id` | admin |
| `GET` `POST` `PATCH` `DELETE` | `/api/users` | admin |
| `GET` | `/api/visits` | filters: `storeId` `userId` `status` `from` `to` `q` `page` |
| `GET` | `/api/visits/:id` | full report |
| `PUT` | `/api/visits/:id` | create or re-sync a whole visit (idempotent) |
| `DELETE` | `/api/visits/:id` | admin; cascades photos off disk |
| `GET` | `/api/visits/:id/export.csv` | |
| `POST` | `/api/photos` | multipart: `photo`, optional `thumb`, `visitId`, `kind` |
| `GET` | `/api/photos` | gallery listing + filters |
| `GET` | `/api/photos/:id/file` | `?size=thumb` `?download=1` `?token=` |
| `PATCH` `DELETE` | `/api/photos/:id` | |
| `POST` | `/api/photos/bulk-delete` | admin |
| `GET` | `/api/stats/overview` | admin |

---

## Before putting this on the internet

The setup above assumes a trusted local network. To expose it publicly you'd want, at
minimum: a strong `JWT_SECRET`, HTTPS in front (nginx/Caddy), rate limiting on
`/api/auth/login`, and removal of the `usesCleartextTraffic` / `NSAllowsArbitraryLoads`
flags in `mobile/app.json` that currently permit plain HTTP to a LAN address.
