'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const rbac = require('../rbac');

const router = express.Router();

router.get('/users', rbac.requireAbility('users.manage'), (req, res) => {
  const list = db.admins.list().map(a => ({
    id: a.id, username: a.username, role: a.role, displayName: a.displayName,
    createdAt: a.createdAt, active: a.active,
  }));
  res.render('users', {
    title: '用户与角色管理',
    admins: list, roles: rbac.ROLES, roleName: rbac.roleName,
    admin: req.admin, can: req.can,
  });
});

router.post('/users/create', rbac.requireAbility('users.manage'), (req, res) => {
  const { username, password, role, displayName } = req.body;
  if (!username || !password) return res.redirect('/users?err=1');
  if (!rbac.ROLES[role]) return res.redirect('/users?err=2');
  if (db.admins.findByName(username)) return res.redirect('/users?err=3');
  if (String(password).length < 6) return res.redirect('/users?err=4');
  db.admins.upsert({
    id: db.uid('u_'), username, passwordHash: bcrypt.hashSync(password, 10),
    role, displayName: displayName || username, createdAt: Date.now(), active: true,
  });
  db.audit.add({ adminId: req.admin.id, action: 'users.create', target: username, detail: '角色=' + rbac.roleName(role) });
  res.redirect('/users');
});

router.post('/users/role/:id', rbac.requireAbility('users.manage'), (req, res) => {
  const a = db.admins.findById(req.params.id);
  if (!a) return res.redirect('/users');
  if (a.id === req.admin.id) return res.redirect('/users?err=5'); // 不能改自己
  if (!rbac.ROLES[req.body.role]) return res.redirect('/users?err=2');
  // 保证至少保留一个超级管理员
  if (a.role === 'super' && req.body.role !== 'super') {
    const supers = db.admins.list().filter(x => x.role === 'super');
    if (supers.length <= 1) return res.redirect('/users?err=6');
  }
  a.role = req.body.role;
  db.admins.upsert(a);
  db.audit.add({ adminId: req.admin.id, action: 'users.role', target: a.username, detail: '改为 ' + rbac.roleName(a.role) });
  res.redirect('/users');
});

router.post('/users/delete/:id', rbac.requireAbility('users.manage'), (req, res) => {
  const a = db.admins.findById(req.params.id);
  if (!a) return res.redirect('/users');
  if (a.id === req.admin.id) return res.redirect('/users?err=5');
  if (a.role === 'super') {
    const supers = db.admins.list().filter(x => x.role === 'super');
    if (supers.length <= 1) return res.redirect('/users?err=6');
  }
  db.admins.remove(a.id);
  db.audit.add({ adminId: req.admin.id, action: 'users.delete', target: a.username, detail: '' });
  res.redirect('/users');
});

module.exports = router;
