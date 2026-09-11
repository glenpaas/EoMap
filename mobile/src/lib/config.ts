import Constants from 'expo-constants';

type Extra = { serverUrl?: string; serverPort?: number };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const PORT = extra.serverPort ?? 4000;

/**
 * Where the app talks to, so field staff only type a username and a password.
 *
 * Resolved in order:
 *  1. `expo.extra.serverUrl` in app.json — set this for a real build, where the
 *     backend has a fixed address.
 *  2. In development, the host serving the Expo bundle. Your laptop's LAN IP
 *     changes between networks, and this follows it automatically, so nothing
 *     needs editing when you move between office and home Wi-Fi.
 *  3. localhost, for the web preview.
 *
 * A device can still be pointed elsewhere in Seaded → Server; that choice is
 * stored on the device and wins over everything here.
 */
function resolve(): string {
  if (extra.serverUrl) return extra.serverUrl;

  // e.g. "192.168.1.199:8081" — the machine running `npx expo start`.
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${PORT}`;

  return `http://localhost:${PORT}`;
}

export const DEFAULT_SERVER_URL = resolve();
