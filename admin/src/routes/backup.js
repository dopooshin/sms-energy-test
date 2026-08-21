'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const rbac = require('../rbac');
const backup = require('../backup');

const router = express.Router();

const upload = multer({
  dest: path.join(backup.BACKUP_DIR, 'uploads'),
  limits: { fileSize: 200 * 1024 * 1024 },
});

router.get('/backup', rbac.requireAbility('backup.manage'), (req, res) => {
  res.render('backup', {
    title: '备份中心',
    backups: db.backups.list(),
    config: db.backupConfig.get(),
    ran: req.query.ran === '1', restored: req.query.restored === '1',
    admin: req.admin, can: req.can, roleName: rbac.roleName,
  });
});

router.post('/backup/run', rbac.requireAbility('backup.manage'), async (req, res) => {
  try {
    await backup.createBackup({ label: '手动一键备份', type: 'manual', by: req.admin });
    res.redirect('/backup?ran=1');
  } catch (e) {
    res.redirect('/backup?err=1');
  }
});

router.post('/backup/config', rbac.requireAbility('backup.manage'), (req, res) => {
  const cfg = {
    enabled: req.body.enabled === 'on' || req.body.enabled === '1',
    frequency: req.body.frequency === 'weekly' ? 'weekly' : 'daily',
    keep: Math.max(1, parseInt(req.body.keep, 10) || 7),
  };
  db.backupConfig.save(cfg);
  backup.startAuto(cfg, () => {});
  db.audit.add({ adminId: req.admin.id, action: 'backup.config', target: '自动备份策略', detail: JSON.stringify(cfg) });
  res.redirect('/backup');
});

router.post('/backup/restore/:id', rbac.requireAbility('backup.manage'), async (req, res) => {
  try {
    await backup.restoreById(req.params.id, req.admin);
    res.redirect('/backup?restored=1');
  } catch (e) {
    console.error(e);
    res.redirect('/backup?err=2');
  }
});

router.post('/backup/upload', rbac.requireAbility('backup.manage'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.redirect('/backup?err=3');
  try {
    await backup.restoreFromZip(req.file.path, req.admin);
    fs.unlinkSync(req.file.path);
    res.redirect('/backup?restored=1');
  } catch (e) {
    console.error(e);
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.redirect('/backup?err=4');
  }
});

router.get('/backup/download/:id', rbac.requireAbility('backup.manage'), (req, res) => {
  const rec = db.backups.get(req.params.id);
  if (!rec) return res.status(404).end();
  const p = path.join(backup.BACKUP_DIR, rec.filename);
  if (!fs.existsSync(p)) return res.status(404).end();
  res.download(p, rec.filename);
});

module.exports = router;
