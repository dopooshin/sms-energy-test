'use strict';
const express = require('express');
const db = require('../db');
const rbac = require('../rbac');

const router = express.Router();

router.get('/', rbac.requireAuth, (req, res) => {
  const backups = db.backups.list();
  const stats = {
    admins: db.admins.count(),
    backups: backups.length,
    lastBackup: backups[0] || null,
    audit: db.audit.list(1)[0] || null,
  };
  res.render('dashboard', {
    title: '仪表盘', stats,
    admin: req.admin, can: req.can, roleName: rbac.roleName,
  });
});

module.exports = router;
