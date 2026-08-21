'use strict';
const express = require('express');
const db = require('../db');
const rbac = require('../rbac');

const router = express.Router();

router.get('/logs', rbac.requireAuth, (req, res) => {
  // 只读访客仅看自己的日志；编辑/超管看全部
  let logs = db.audit.list(200);
  if (req.admin.role === 'viewer') logs = logs.filter(l => l.adminId === req.admin.id);
  res.render('logs', {
    title: '操作日志',
    logs,
    admin: req.admin, can: req.can, roleName: rbac.roleName,
  });
});

module.exports = router;
