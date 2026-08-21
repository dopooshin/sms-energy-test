/* ============================================
   SMS 思谋思 · 深蓝主题公共脚本 (atmos.js)
   导航交互 / 滚动渐入 / 案例筛选 / 监测演示
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* --- 导航栏滚动磨砂 --- */
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 60) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }, { passive: true });
  }

  /* --- 移动端菜单 --- */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { navLinks.classList.remove('open'); });
    });
  }

  /* --- 当前页面高亮 --- */
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href) return;
    var target = href.split('#')[0];
    if (target === currentPage || (currentPage === '' && target === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* --- 滚动渐入 --- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          setTimeout(function () { entry.target.classList.add('visible'); }, i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  /* --- 案例筛选 --- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var caseCards = document.querySelectorAll('.case-detail');
  if (filterBtns.length && caseCards.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (x) { x.classList.remove('filter-btn--active'); });
        btn.classList.add('filter-btn--active');
        var f = btn.getAttribute('data-filter');
        caseCards.forEach(function (card) {
          var cat = card.getAttribute('data-category');
          card.style.display = (f === 'all' || cat === f) ? '' : 'none';
        });
      });
    });
  }

  /* --- 监测页演示数据 --- */
  initMonitorDemo();
});

/* ============================================
   设备监测演示（预留 DTU→TCP 接口）
   ============================================ */
function initMonitorDemo() {
  var dashboard = document.querySelector('.dashboard-grid');
  if (!dashboard) return;

  var demoDevices = [
    { id: 'A01', name: '分布式电磁除垢仪 #A01', status: 'online', temp: 42.3, current: 3.2, runtime: 1280 },
    { id: 'A02', name: '分布式电磁除垢仪 #A02', status: 'online', temp: 38.7, current: 2.9, runtime: 956 },
    { id: 'B01', name: '电磁水处理仪 #B01', status: 'warning', temp: 56.2, current: 4.1, runtime: 640 },
    { id: 'B03', name: '电磁水处理仪 #B03', status: 'offline', temp: '--', current: '--', runtime: 0 }
  ];

  renderDeviceCards(demoDevices);
}

/* HTML 转义：防止动态内容 XSS */
function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* 状态白名单，杜绝 class 注入 */
var DEVICE_STATUS_WHITELIST = ['online', 'warning', 'offline', 'error'];

function renderDeviceCards(devices) {
  var container = document.querySelector('.dashboard-grid');
  if (!container) return;
  if (!Array.isArray(devices)) return;

  container.innerHTML = devices.map(function (device) {
    if (!device || typeof device !== 'object') return '';

    var rawStatus = DEVICE_STATUS_WHITELIST.indexOf(device.status) !== -1 ? device.status : 'offline';
    var statusClass = 'device-card--' + rawStatus;
    var statusText = rawStatus === 'online' ? '运行中' :
                     rawStatus === 'warning' ? '异常告警' :
                     rawStatus === 'error' ? '故障' : '离线';

    var temp = Number(device.temp);
    var tempValue = (device.temp !== '--' && isFinite(temp)) ? (temp.toFixed(1) + '°C') : '--';
    var tempClass = (temp > 50) ? 'metric__value--hot' : '';

    var cur = Number(device.current);
    var curValue = (device.current !== '--' && isFinite(cur)) ? (cur.toFixed(1) + 'A') : '--';

    var rt = Number(device.runtime);
    var rtValue = isFinite(rt) ? (Math.round(rt) + 'h') : '--';

    return '<div class="device-card ' + esc(statusClass) + '">' +
      '<div class="device-card__header">' +
        '<span class="device-card__name">' + esc(device.name) + '</span>' +
        '<span class="device-card__status">' +
          '<span class="status-dot status-dot--' + esc(rawStatus) + '"></span>' +
          esc(statusText) +
        '</span>' +
      '</div>' +
      '<div class="device-metrics">' +
        '<div class="metric"><div class="metric__label">温度</div><div class="metric__value ' + esc(tempClass) + '">' + esc(tempValue) + '</div></div>' +
        '<div class="metric"><div class="metric__label">电流</div><div class="metric__value">' + esc(curValue) + '</div></div>' +
        '<div class="metric"><div class="metric__label">运行时间</div><div class="metric__value">' + esc(rtValue) + '</div></div>' +
        '<div class="metric"><div class="metric__label">设备编号</div><div class="metric__value" style="font-size:14px;color:#999;">' + esc(device.id) + '</div></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* DTU 接入接口（安全基线）
   仅允许 wss://，需 token + deviceId，异常帧直接丢弃。 */
function connectDTU(serverUrl, options) {
  options = options || {};
  var token = options.token || '';
  var deviceId = options.deviceId || '';
  if (!serverUrl || serverUrl.indexOf('wss://') !== 0) {
    console.warn('[SMS Monitor] 仅支持 wss:// 加密连接，已拒绝明文地址');
    return;
  }
  if (!token || !deviceId) {
    console.warn('[SMS Monitor] 缺少 token 或 deviceId，拒绝连接');
    return;
  }
  try {
    var ws = new WebSocket(serverUrl + '?token=' + encodeURIComponent(token) + '&deviceId=' + encodeURIComponent(deviceId));
    ws.onmessage = function (event) {
      try {
        var payload = JSON.parse(event.data);
        if (!payload || !Array.isArray(payload.devices)) {
          console.warn('[SMS Monitor] 收到非法数据结构，已忽略');
          return;
        }
        renderDeviceCards(payload.devices);
      } catch (e) {
        console.warn('[SMS Monitor] 数据解析失败，已忽略异常帧');
      }
    };
    ws.onerror = function () { console.warn('[SMS Monitor] 连接异常，请检查网络或服务端状态'); };
  } catch (e) {
    console.warn('[SMS Monitor] 建立连接失败');
  }
}
