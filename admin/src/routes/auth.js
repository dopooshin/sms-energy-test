'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.admin) return res.redirect('/');
  res.render('login', { title: '登录', error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.admins.findByName(username);
  if (!admin || !admin.active || !bcrypt.compareSync(password, admin.passwordHash)) {
    return res.render('login', { title: '登录', error: '用户名或密码错误' });
  }
  req.session.userId = admin.id;
  db.audit.add({ adminId: admin.id, action: 'auth.login', target: username, detail: '登录成功' });
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  if (req.admin) db.audit.add({ adminId: req.admin.id, action: 'auth.logout', target: req.admin.username, detail: '' });
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
