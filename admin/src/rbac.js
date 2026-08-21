'use strict';
/**
 * 三级角色权限模型（RBAC）。
 * 角色 -> 权限点(ability) 映射；服务端 requireAbility 强制校验，
 * 前端通过 res.locals.can 按角色隐藏无权操作项，做到"不专业的人看不到、改不了"。
 */
const ROLES = {
  super: {
    name: '超级管理员',
    abilities: ['settings.manage', 'content.manage', 'users.manage', 'backup.manage'],
  },
  editor: {
    name: '内容编辑',
    abilities: ['content.manage'],
  },
  viewer: {
    name: '只读访客',
    abilities: [],
  },
};

function roleName(role) { return (ROLES[role] && ROLES[role].name) || role; }
function abilitiesOf(role) { return (ROLES[role] && ROLES[role].abilities) || []; }
function can(admin, ability) {
  if (!admin) return false;
  return abilitiesOf(admin.role).includes(ability);
}

/**
 * 服务端中间件：未登录跳转登录页；无权限返回 403。
 * @param {string} ability 需要的权限点
 */
function requireAbility(ability) {
  return function (req, res, next) {
    if (!req.admin) return res.redirect('/login');
    if (!can(req.admin, ability)) {
      return res.status(403).render('error', {
        title: '无权限',
        message: '当前账号（' + roleName(req.admin.role) + '）无权访问该操作。',
        admin: req.admin, can: req.can,
      });
    }
    next();
  };
}

/** 仅需登录（访客等已登录角色也可访问的页，如仪表盘、日志）。 */
function requireAuth(req, res, next) {
  if (!req.admin) return res.redirect('/login');
  next();
}

module.exports = { ROLES, roleName, abilitiesOf, can, requireAbility, requireAuth };
