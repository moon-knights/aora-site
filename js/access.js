/* ═══════════════════════════════════════════════════════════════════
   آئورا — سیستم کنترل دسترسی v3
   ═══════════════════════════════════════════════════════════════════ */
var Access = (function () {

  function getCurrentUser() {
    try {
      var raw = localStorage.getItem('aoura_user');
      if (raw && raw !== 'undefined' && raw !== 'null') return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  /* ── صفحات محافظت‌شده ── */
  var protectedPages = {
    'surveys.html':            ['admin'],
    'survey-builder.html':     ['admin'],
    'survey-results.html':     ['admin'],
    'survey-view.html':        ['admin'],
    'meetings.html':           ['admin'],
    'meeting-lobby.html':      ['admin'],
    'meeting-room.html':       ['admin'],
    'dashboard-admin.html':    ['admin'],
    'admin-page-builder.html': ['admin'],
    'dashboard-professor.html': ['professor', 'admin'],
    'dashboard-student.html':   ['student', 'professor', 'admin'],
    'cart.html':    ['student', 'professor', 'admin'],
    'payment.html': ['student', 'professor', 'admin']
  };

  /* ── صفحاتی که access.js نباید روشون اجرا بشه ── */
  var skipPages = [
    'dashboard-admin.html',
    'admin-page-builder.html'
  ];

  /* ── بررسی حالت تعمیر ── */
  function checkMaintenance() {
    var settings = {};
    try {
      var raw = localStorage.getItem('aoura_settings');
      if (raw) settings = JSON.parse(raw);
    } catch (e) {}
    if (!settings.maintenanceMode) return { blocked: false };
    var user = getCurrentUser();
    if (user && user.role === 'admin') return { blocked: false };
    return { blocked: true, message: settings.maintenanceMessage || 'سایت در حال بروزرسانی است. لطفاً بعداً مراجعه کنید.' };
  }

  /* ── بررسی صفحات غیرفعال ── */
  function checkPageActive() {
    var page = getCurrentPage();
    var sitePages = null;
    try {
      var raw = localStorage.getItem('aoura_site_pages');
      if (raw) sitePages = JSON.parse(raw);
    } catch (e) {}
    if (sitePages) {
      var found = sitePages.find(function (p) { return p.file === page; });
      if (found && !found.active) {
        var user = getCurrentUser();
        if (user && user.role === 'admin') return { blocked: false };
        return { blocked: true, message: 'این صفحه موقتاً غیرفعال است.' };
      }
    }
    return { blocked: false };
  }

  function getCurrentPage() {
    var path = window.location.pathname;
    var parts = path.split('/');
    return parts[parts.length - 1] || 'index.html';
  }

  /* ── بررسی اصلی ── */
  function checkAccess() {
    var page = getCurrentPage();

    // صفحات ادمین → فقط نقش رو چک کن، حالت تعمیر و غیرفعال رو رد کن
    var allowedRoles = protectedPages[page];

    // بررسی حالت تعمیر (فقط صفحات عمومی)
    if (skipPages.indexOf(page) < 0) {
      var maintenance = checkMaintenance();
      if (maintenance.blocked) {
        return { allowed: false, reason: 'maintenance', message: maintenance.message };
      }
      var pageActive = checkPageActive();
      if (pageActive.blocked) {
        return { allowed: false, reason: 'page_inactive', message: pageActive.message };
      }
    }

    // صفحه عمومی
    if (!allowedRoles) return { allowed: true, reason: 'public' };

    // بررسی لاگین
    var user = getCurrentUser();
    if (!user) {
      return {
        allowed: false,
        reason: 'not_logged_in',
        message: 'برای دسترسی به این صفحه باید وارد شوید.',
        redirect: 'login.html?redirect=' + encodeURIComponent(page)
      };
    }

    // بررسی نقش
    if (allowedRoles.indexOf(user.role) < 0) {
      return {
        allowed: false,
        reason: 'wrong_role',
        message: 'شما اجازه دسترسی به این صفحه را ندارید.',
        redirect: getDashboard(user.role)
      };
    }

    return { allowed: true, reason: 'authorized', user: user };
  }

  function enforce() {
    var result = checkAccess();
    if (!result.allowed) {
      showAccessDenied(result.message, result.redirect || 'index.html', result.reason);
      return false;
    }
    return true;
  }

  function showAccessDenied(message, redirectUrl, reason) {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;padding:0;background:#080808;font-family:Vazirmatn,sans-serif';

    var icon  = reason === 'maintenance' ? '🔧' : reason === 'not_found' ? '🔍' : '🔒';
    var title = reason === 'maintenance' ? 'سایت در حال بروزرسانی' :
                reason === 'not_found' ? 'صفحه یافت نشد' : 'دسترسی مجاز نیست';

    var btns = '';
    if (reason !== 'maintenance') {
      btns += '<a href="' + redirectUrl + '" style="display:inline-flex;align-items:center;gap:8px;padding:.7rem 1.5rem;background:#e8c547;color:#080808;border:none;border-radius:10px;font-family:Vazirmatn,sans-serif;font-size:.85rem;font-weight:600;cursor:pointer;text-decoration:none">بازگشت ←</a>';
    }
    btns += '<a href="login.html" style="display:inline-flex;align-items:center;gap:8px;padding:.7rem 1.5rem;background:transparent;color:#f0ece4;border:1px solid rgba(255,255,255,.1);border-radius:10px;font-family:Vazirmatn,sans-serif;font-size:.85rem;cursor:pointer;text-decoration:none">ورود ادمین</a>';

    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;direction:rtl;text-align:center">' +
      '<div style="max-width:450px">' +
      '<div style="font-size:5rem;margin-bottom:1.5rem">' + icon + '</div>' +
      '<h1 style="font-size:1.5rem;font-weight:700;color:#f0ece4;margin-bottom:.75rem">' + title + '</h1>' +
      '<p style="font-size:.9rem;color:#7a7570;margin-bottom:2rem;line-height:2">' + message + '</p>' +
      '<div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">' + btns + '</div>' +
      '</div></div>';

    if (reason !== 'maintenance') {
      setTimeout(function () { window.location.href = redirectUrl; }, 5000);
    }
  }

  function getDashboard(role) {
    switch (role) {
      case 'admin':     return 'dashboard-admin.html';
      case 'professor': return 'dashboard-professor.html';
      case 'student':   return 'dashboard-student.html';
      default:          return 'index.html';
    }
  }

  return {
    checkAccess:      checkAccess,
    enforce:          enforce,
    checkMaintenance: checkMaintenance,
    checkPageActive:  checkPageActive,
    protectedPages:   protectedPages,
    getDashboard:     getDashboard
  };
})();

/* ── اجرا (فقط صفحات عمومی و محافظت‌شده معمولی) ── */
$(document).ready(function () {
  var page = window.location.pathname.split('/').pop() || 'index.html';
  var skipPages = ['dashboard-admin.html', 'admin-page-builder.html'];
  if (skipPages.indexOf(page) < 0) {
    Access.enforce();
  }
});