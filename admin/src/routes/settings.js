'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const rbac = require('../rbac');
const { PROJECT_ROOT } = require('../backup');

const router = express.Router();
const SITE_SETTINGS = path.join(PROJECT_ROOT, 'assets', 'site-settings.json');

function buildFromForm(body) {
  const labels = Array.isArray(body.navLabel) ? body.navLabel : [body.navLabel].filter(Boolean);
  const hrefs = Array.isArray(body.navHref) ? body.navHref : [body.navHref].filter(Boolean);
  const nav = labels.map((label, i) => ({ label, href: hrefs[i] || '' })).filter(n => n.label && n.href);
  return {
    siteTitle: body.siteTitle || '',
    siteDescription: body.siteDescription || '',
    canonicalBase: body.canonicalBase || '',
    ogTitle: body.ogTitle || '',
    ogDescription: body.ogDescription || '',
    icp: body.icp || '',
    themeColor: body.themeColor || '#0a1a2f',
    footerText: body.footerText || '',
    nav,
  };
}

// 发布：把设置写入站点可消费的配置（供前端/构建读取）
function publish(obj) {
  fs.mkdirSync(path.dirname(SITE_SETTINGS), { recursive: true });
  fs.writeFileSync(SITE_SETTINGS, JSON.stringify(obj, null, 2), 'utf8');
}

router.get('/settings', rbac.requireAbility('settings.manage'), (req, res) => {
  res.render('settings', {
    title: '全局站点设置',
    settings: db.settings.get(),
    saved: req.query.saved === '1',
    admin: req.admin, can: req.can, roleName: rbac.roleName,
  });
});

router.post('/settings', rbac.requireAbility('settings.manage'), (req, res) => {
  const obj = buildFromForm(req.body);
  db.settings.save(obj);
  publish(obj);
  db.audit.add({ adminId: req.admin.id, action: 'settings.publish', target: '全局设置', detail: '已发布至 ' + path.relative(PROJECT_ROOT, SITE_SETTINGS) });
  res.redirect('/settings?saved=1');
});

module.exports = router;
