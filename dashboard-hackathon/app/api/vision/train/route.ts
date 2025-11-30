import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

const ROOT = path.join(process.cwd(), '..'); // project root where train_unet.py lives
const LOG_DIR = path.join(ROOT, 'logs');
const TRAIN_LOG = path.join(LOG_DIR, 'train.log');
const TRAIN_PID = path.join(LOG_DIR, 'train.pid');
const MODEL_PATH = path.join(ROOT, 'models', 'unet_best.pth');

function isPidRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

export async function GET() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    let pid: number | null = null;
    let training = false;
    if (fs.existsSync(TRAIN_PID)) {
      const raw = fs.readFileSync(TRAIN_PID, 'utf-8').trim();
      pid = Number(raw) || null;
      if (pid && isPidRunning(pid)) training = true;
    }

    let lastLog = '';
    if (fs.existsSync(TRAIN_LOG)) {
      const stat = fs.statSync(TRAIN_LOG);
      const size = stat.size;
      const readSize = Math.min(64 * 1024, size);
      const fd = fs.openSync(TRAIN_LOG, 'r');
      const buffer = Buffer.alloc(readSize);
      fs.readSync(fd, buffer, 0, readSize, Math.max(0, size - readSize));
      fs.closeSync(fd);
      lastLog = buffer.toString('utf-8');
    }

    return NextResponse.json({ training, pid, model_exists: fs.existsSync(MODEL_PATH), last_log: lastLog });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    // check if already running
    if (fs.existsSync(TRAIN_PID)) {
      const raw = fs.readFileSync(TRAIN_PID, 'utf-8').trim();
      const pid = Number(raw) || null;
      if (pid && isPidRunning(pid)) {
        return NextResponse.json({ started: false, reason: 'already_running', pid });
      }
    }

    // start training in background using python3
    const py = 'python3';
    const script = path.join(ROOT, 'train_unet.py');
    if (!fs.existsSync(script)) {
      return NextResponse.json({ error: 'train_unet.py not found', path: script }, { status: 400 });
    }

    const out = fs.openSync(TRAIN_LOG, 'a');
    const err = fs.openSync(TRAIN_LOG, 'a');
    const child = spawn(py, [script, '--epochs', '5'], {
      cwd: ROOT,
      detached: true,
      stdio: ['ignore', out, err],
    });
    child.unref();

    fs.writeFileSync(TRAIN_PID, String(child.pid));

    return NextResponse.json({ started: true, pid: child.pid });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
