import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** backend/ directory */
export const ROOT = path.resolve(here, '..');
export const UPLOADS = path.join(ROOT, 'uploads');
export const PUBLIC = path.join(ROOT, 'public');
