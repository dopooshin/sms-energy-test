'use strict';
/**
 * 初始化：若没有任何管理员，则创建三个演示账号（上线后应删除演示账号并改密）。
 * 运行：node src/seed.js
 */
const bcrypt = require('bcryptjs');
const db = require('./db');

function make(username, password, role, displayName) {
  return {
    id: db.uid('u_'),
    username, passwordHash: bcrypt.hashSync(password, 10),
    role, displayName: displayName || username,
    createdAt: Date.now(), active: true,
  };
}

const seeds = [
  make('admin',   'admin123',  'super',  '超级管理员'),
  make('editor',  'editor123', 'editor', '内容编辑'),
  make('viewer',  'viewer123', 'viewer', '只读访客'),
];

if (db.admins.count() === 0) {
  seeds.forEach(s => db.admins.upsert(s));
  console.log('已初始化演示账号：');
  console.log('  超级管理员  admin  / admin123');
  console.log('  内容编辑    editor / editor123');
  console.log('  只读访客    viewer / viewer123');
  console.log('请登录后立即修改密码并删除不需要的演示账号。');
} else {
  console.log('已存在管理员，跳过初始化。当前数量：', db.admins.count());
}
