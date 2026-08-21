'use strict';
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const db = require('./src/db');
const rbac = require('./src/rbac');
const backup = require('./src/backup');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.ADMIN_SECRET || 'sms-admin-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
}));

// 登录用户加载（每次请求）
app.use((req, res, next) => {
  let admin = null;
  if (req.session && req.session.userId) admin = db.admins.findById(req.session.userId);
  req.admin = admin;
  req.can = (ability) => rbac.can(admin, ability);
  res.locals.admin = admin;
  res.locals.can = req.can;
  res.locals.roleName = rbac.roleName;
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./src/routes/auth'));
app.use('/', require('./src/routes/dashboard'));
app.use('/', require('./src/routes/settings'));
app.use('/', require('./src/routes/users'));
app.use('/', require('./src/routes/backup'));
app.use('/', require('./src/routes/logs'));

app.use((req, res) => {
  res.status(404).render('error', {
    title: '页面不存在', message: '找不到该页面（' + req.path + '）',
    admin: req.admin, can: req.can,
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: '服务器错误', message: '内部错误，请查看日志。', admin: req.admin, can: req.can });
});

// 启动自动备份（按已保存配置）
backup.startAuto(db.backupConfig.get(), () => {});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('思谋思后台已启动: http://localhost:' + PORT);
  if (db.admins.count() === 0) console.log('尚未初始化账号，请先运行: npm run seed');
});

module.exports = app;
