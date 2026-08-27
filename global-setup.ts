import dotenv from 'dotenv';
import path from 'path';
import { ensureSession } from './pages/wmio/api/WmioSession';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default async function globalSetup() {
    await ensureSession();
}
