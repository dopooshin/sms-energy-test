'use strict';
/**
 * 备份中心：一键备份、自动备份（node-cron）、历史列表、恢复。
 * 备份范围：后台数据(data) + 官网源(pages) + 静态资源(assets)，打包为带时间戳 zip。
 * 恢复前会自动再创建一份安全备份，避免误操作导致数据丢失。
 */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const extract = require('extract-zip');
const cron = require('node-cron');
const db = require('./db');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SITE_PAGES = path.join(PROJECT_ROOT, 'pages');
const SITE_ASSETS = path.join(PROJECT_ROOT, 'assets');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function ensureDirs() { for (const d of [BACKUP_DIR]) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

function zipDirs(dirs, outPath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    out.on('close', () => resolve());
    archive.on('error', reject);
    archive.pipe(out);
    dirs.forEach(d => { if (fs.existsSync(d.dir)) archive.directory(d.dir, d.name); });
    archive.finalize();
  });
}

async function createBackup({ label = '手动备份', type = 'manual', by = 'system' } = {}) {
  ensureDirs();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${ts}.zip`;
  const outPath = path.join(BACKUP_DIR, filename);
  await zipDirs([
    { dir: db.DATA_DIR, name: 'data' },
    { dir: SITE_PAGES, name: 'pages' },
    { dir: SITE_ASSETS, name: 'assets' },
  ], outPath);
  const stat = fs.statSync(outPath);
  const rec = db.backups.add({
    id: db.uid('b_'), filename, size: stat.size,
    label, type, createdAt: Date.now(), by,
  });
  db.audit.add({ adminId: typeof by === 'string' ? null : by, action: 'backup.create', target: filename, detail: `类型=${type} 大小=${stat.size}B` });
  return rec;
}

async function restoreFromZip(zipPath, by = 'system') {
  ensureDirs();
  // 1) 恢复前先自动安全备份
  await createBackup({ label: '恢复前自动安全备份', type: 'safety', by });
  // 2) 解压到临时目录
  const tmp = path.join(BACKUP_DIR, 'restore-tmp-' + Date.now());
  fs.mkdirSync(tmp, { recursive: true });
  await extract(zipPath, { dir: tmp });
  // 3) 回写 data / pages / assets
  for (const name of ['data', 'pages', 'assets']) {
    const src = path.join(tmp, name);
    if (fs.existsSync(src)) {
      const dest = name === 'data' ? db.DATA_DIR : path.join(PROJECT_ROOT, name);
      copyDir(src, dest);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  db.audit.add({ adminId: typeof by === 'string' ? null : by, action: 'backup.restore', target: path.basename(zipPath), detail: '已从备份恢复（恢复前已自动安全备份）' });
}

async function restoreById(id, by = 'system') {
  const rec = db.backups.get(id);
  if (!rec) throw new Error('备份不存在');
  const p = path.join(BACKUP_DIR, rec.filename);
  if (!fs.existsSync(p)) throw new Error('备份文件缺失');
  return restoreFromZip(p, by);
}

function pruneAuto(keep) {
  const list = db.backups.list().filter(b => b.type === 'auto');
  const excess = list.slice(keep);
  excess.forEach(b => {
    const p = path.join(BACKUP_DIR, b.filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    db.backups.remove(b.id);
  });
}

let job = null;
function startAuto(config, onRun) {
  if (job) { job.stop(); job = null; }
  if (!config || !config.enabled) return null;
  const expr = config.frequency === 'weekly' ? '0 3 * * 1' : '0 3 * * *';
  job = cron.schedule(expr, async () => {
    try {
      const rec = await createBackup({ label: '自动备份', type: 'auto', by: 'system' });
      pruneAuto(config.keep || 7);
      onRun && onRun(rec);
    } catch (e) { console.error('[自动备份] 失败:', e); }
  });
  return job;
}

module.exports = {
  BACKUP_DIR, SITE_PAGES, SITE_ASSETS, PROJECT_ROOT,
  createBackup, restoreFromZip, restoreById, pruneAuto, startAuto,
};
