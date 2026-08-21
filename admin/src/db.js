'use strict';
/**
 * 轻量 JSON 数据层（无需原生编译，跨平台可直接运行）。
 * 所有集合以独立 JSON 文件存于 admin/data/ 下。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function file(name) { return path.join(DATA_DIR, name + '.json'); }
function read(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch (e) {
    return fallback;
  }
}
function write(name, data) {
  fs.writeFileSync(file(name), JSON.stringify(data, null, 2), 'utf8');
}
function uid(prefix) { return (prefix || '') + crypto.randomBytes(6).toString('hex'); }

/* ---------- 管理员 ---------- */
const admins = {
  list: () => read('admins', []),
  findByName: (username) => admins.list().find(a => a.username === username) || null,
  findById: (id) => admins.list().find(a => a.id === id) || null,
  upsert: (admin) => {
    const list = admins.list();
    const i = list.findIndex(a => a.id === admin.id);
    if (i >= 0) list[i] = admin; else list.push(admin);
    write('admins', list);
    return admin;
  },
  remove: (id) => {
    write('admins', admins.list().filter(a => a.id !== id));
  },
  count: () => admins.list().length,
};

/* ---------- 全局设置 ---------- */
const DEFAULT_SETTINGS = {
  siteTitle: '洛阳思谋思能源科技有限公司',
  siteDescription: '专注电磁物理除垢与工业循环水节能整体方案。',
  canonicalBase: 'https://www.sms-energy.com/',
  ogTitle: '洛阳思谋思能源科技有限公司',
  ogDescription: '以变频电磁场替代化学药剂，让工业循环水免药剂、不结垢、更节能。',
  icp: '',                 // 备案号占位，待填
  themeColor: '#0a1a2f',
  footerText: '© 2021-2026 洛阳思谋思能源科技有限公司 版权所有',
  nav: [
    { label: '首页', href: 'index.html' },
    { label: '关于我们', href: 'about.html' },
    { label: '产品中心', href: 'products.html' },
    { label: '解决方案', href: 'solutions.html' },
    { label: '技术实力', href: 'technology.html' },
    { label: '运行监测', href: 'monitor.html' },
    { label: '新闻动态', href: 'news.html' },
    { label: '客户案例', href: 'cases.html' },
  ],
};
const settings = {
  get: () => Object.assign({}, DEFAULT_SETTINGS, read('settings', {})),
  save: (obj) => { write('settings', obj); return obj; },
};

/* ---------- 备份记录 ---------- */
const backups = {
  list: () => read('backups', []).sort((a, b) => b.createdAt - a.createdAt),
  add: (rec) => { const l = read('backups', []); l.push(rec); write('backups', l); return rec; },
  get: (id) => read('backups', []).find(b => b.id === id) || null,
  remove: (id) => { write('backups', read('backups', []).filter(b => b.id !== id)); },
};

/* ---------- 自动备份配置 ---------- */
const backupConfig = {
  get: () => Object.assign({ enabled: false, frequency: 'daily', keep: 7 }, read('backupConfig', {})),
  save: (obj) => { write('backupConfig', obj); return obj; },
};

/* ---------- 审计日志 ---------- */
const audit = {
  add: (entry) => {
    const l = read('audit', []);
    l.push(Object.assign({ id: uid('a_'), at: Date.now() }, entry));
    // 仅保留最近 500 条
    write('audit', l.slice(-500));
  },
  list: (limit) => {
    const l = read('audit', []).sort((a, b) => b.at - a.at);
    return limit ? l.slice(0, limit) : l;
  },
};

module.exports = { DATA_DIR, uid, admins, settings, backups, backupConfig, audit };
