/* ============================================
   SMS 思谋思 - 公共 JavaScript
   导航交互 / 响应式 / 通用功能
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
  
  // --- 移动端导航切换 ---
  const navToggle = document.querySelector('.nav__toggle');
  const nav = document.querySelector('.nav');
  
  if (navToggle && nav) {
    navToggle.addEventListener('click', function() {
      this.classList.toggle('nav__toggle--open');
      nav.classList.toggle('nav--open');
      document.body.style.overflow = nav.classList.contains('nav--open') ? 'hidden' : '';
    });

    // 点击导航链接后关闭菜单
    nav.querySelectorAll('.nav__link').forEach(function(link) {
      link.addEventListener('click', function() {
        navToggle.classList.remove('nav__toggle--open');
        nav.classList.remove('nav--open');
        document.body.style.overflow = '';
      });
    });
  }

  // --- 滚动时导航栏效果 ---
  const header = document.querySelector('.header');
  let lastScrollY = 0;
  
  if (header) {
    window.addEventListener('scroll', function() {
      const scrollY = window.scrollY;
      
      if (scrollY > 80) {
        header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
      } else {
        header.style.boxShadow = 'var(--shadow-md)';
      }
      
      lastScrollY = scrollY;
    }, { passive: true });
  }

  // --- 平滑滚动到锚点 ---
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // --- 当前页面高亮导航 ---
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(function(link) {
    const href = link.getAttribute('href');
    if (href === currentPage || 
        (currentPage === '' && href === 'index.html') ||
        (currentPage === 'index.html' && href === 'index.html')) {
      link.classList.add('nav__link--active');
    }
  });

  // --- 图片懒加载占位 ---
  // 后续可替换为 Intersection Observer 实现
  const placeholderImages = document.querySelectorAll('[data-placeholder]');
  placeholderImages.forEach(function(img) {
    img.addEventListener('error', function() {
      this.style.backgroundColor = '#e8e8e8';
      this.alt = this.alt || '图片加载中...';
    });
  });

  // --- 设备监测页：模拟数据更新（预留 DTU 接口） ---
  // 本期仅展示演示数据，后期替换为真实 DTU→TCP 数据
  initMonitorDemo();

});

/**
 * 设备监测演示数据
 * 预留接口：后期通过 WebSocket / 轮询 从后端获取真实 DTU 数据
 * 数据格式: { deviceId, name, status, temperature, current, runtime, ... }
 */
function initMonitorDemo() {
  const dashboard = document.querySelector('.dashboard-grid');
  if (!dashboard) return;

  // 演示数据 - 后续从 API 替换
  const demoDevices = [
    { id: 'A01', name: '分布式电磁除垢仪 #A01', status: 'online', temp: 42.3, current: 3.2, runtime: 1280 },
    { id: 'A02', name: '分布式电磁除垢仪 #A02', status: 'online', temp: 38.7, current: 2.9, runtime: 956 },
    { id: 'B01', name: '电磁水处理仪 #B01', status: 'warning', temp: 56.2, current: 4.1, runtime: 640 },
    { id: 'B03', name: '电磁水处理仪 #B03', status: 'offline', temp: '--', current: '--', runtime: 0 },
  ];

  renderDeviceCards(demoDevices);
}

/**
 * HTML 转义 —— 防止动态渲染内容造成 XSS（高危项已修复）
 * 所有进入 innerHTML 的动态字段都必须先过这一道。
 */
function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/**
 * 设备状态白名单 —— 只允许已知状态，杜绝 class 属性注入
 */
var DEVICE_STATUS_WHITELIST = ['online', 'warning', 'offline', 'error'];

function renderDeviceCards(devices) {
  const container = document.querySelector('.dashboard-grid');
  if (!container) return;
  if (!Array.isArray(devices)) return; // 容错：结构非法直接放弃渲染

  container.innerHTML = devices.map(function(device) {
    if (!device || typeof device !== 'object') return '';

    // 状态走白名单，非法状态回退 offline，绝不直接拼接不可信值到 class
    var rawStatus = DEVICE_STATUS_WHITELIST.indexOf(device.status) !== -1 ? device.status : 'offline';
    var statusClass = 'device-card--' + rawStatus;
    var statusText = rawStatus === 'online' ? '运行中' :
                     rawStatus === 'warning' ? '异常告警' :
                     rawStatus === 'error' ? '故障' : '离线';

    // 数值字段强转 + 有限性校验，非数字/越界一律显示占位
    var temp = Number(device.temp);
    var tempValue = (device.temp !== '--' && isFinite(temp)) ? (temp.toFixed(1) + '°C') : '--';
    var tempClass = (temp > 50) ? 'metric__value--hot' : '';

    var cur = Number(device.current);
    var curValue = (device.current !== '--' && isFinite(cur)) ? (cur.toFixed(1) + 'A') : '--';

    var rt = Number(device.runtime);
    var rtValue = isFinite(rt) ? (Math.round(rt) + 'h') : '--';

    // 所有动态字段经 esc() 转义后再插入 DOM
    return '<div class="device-card ' + esc(statusClass) + '">' +
      '<div class="device-card__header">' +
        '<span class="device-card__name">' + esc(device.name) + '</span>' +
        '<span class="device-card__status device-card__status--' + esc(rawStatus) + '">' +
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

/**
 * DTU 数据接入接口（安全基线版）
 * 设计要求（详见安全审计报告第四节）：
 *  1. 仅允许 wss://（TLS 加密），禁止明文 ws:// 或裸 TCP 直连浏览器
 *  2. 连接必须携带后端签发的鉴权 token 与 deviceId，禁止仅依赖源 IP
 *  3. 收到数据先在 try/catch 中 JSON.parse 并校验结构，异常帧直接丢弃，再交给渲染层
 *  4. 不在日志中打印完整 token
 *
 * @param {string} serverUrl - wss:// 服务地址
 * @param {object} options - { token, deviceId }
 */
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
    var ws = new WebSocket(
      serverUrl + '?token=' + encodeURIComponent(token) + '&deviceId=' + encodeURIComponent(deviceId)
    );

    ws.onmessage = function(event) {
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

    ws.onerror = function() {
      console.warn('[SMS Monitor] 连接异常，请检查网络或服务端状态');
    };
  } catch (e) {
    console.warn('[SMS Monitor] 建立连接失败');
  }
}

// --- 表单验证辅助 ---
function validateForm(formElement) {
  var isValid = true;
  var requiredFields = formElement.querySelectorAll('[required]');
  
  requiredFields.forEach(function(field) {
    if (!field.value.trim()) {
      isValid = false;
      field.style.borderColor = 'var(--color-danger)';
    } else {
      field.style.borderColor = 'var(--color-border)';
    }
  });
  
  return isValid;
}
