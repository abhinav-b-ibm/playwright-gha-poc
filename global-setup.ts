import dotenv from 'dotenv';
import path from 'path';
import { ensureSession } from './utils/wmioSession';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default async function globalSetup() {
    await ensureSession();
}
