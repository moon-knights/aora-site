/* ═══════════════════════════════════════════════════════════════════
   آئورا — app.js v4 (تمیز و بدون conflict)
   ═══════════════════════════════════════════════════════════════════ */
$(document).ready(function () {

  /* ═══ ناوبری ═══ */
  $(window).on('scroll', function () {
    if ($(this).scrollTop() > 50) $('#mainNav').addClass('scrolled');
    else $('#mainNav').removeClass('scrolled');
  });

  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  $('.nav-links a').each(function () {
    if ($(this).attr('href') === currentPage) $(this).addClass('active');
  });


  /* ═══════════════════════════════════════════
     Auth
     ═══════════════════════════════════════════ */
  var Auth = {
    STORAGE_KEY: 'aoura_user',

    getCurrentUser: function () {
      try {
        var raw = localStorage.getItem(this.STORAGE_KEY);
        if (!raw || raw === 'undefined' || raw === 'null') return null;
        return JSON.parse(raw);
      } catch (e) { return null; }
    },

    setCurrentUser: function (user) {
      if (!user) localStorage.removeItem(this.STORAGE_KEY);
      else localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
      this.updateUI();
    },

    isLoggedIn: function () { return !!this.getCurrentUser(); },
    hasRole: function (role) { var u = this.getCurrentUser(); return u && u.role === role; },

    register: function (data) {
      var users = JSON.parse(localStorage.getItem('aoura_users') || '[]');
      var exists = users.find(function (u) { return u.email.toLowerCase() === data.email.toLowerCase(); });
      if (exists) return { success: false, message: 'این ایمیل قبلاً ثبت شده است.' };

      if (data.nationalCode) {
        var dup = users.find(function (u) { return u.nationalCode === data.nationalCode; });
        if (dup) return { success: false, message: 'این کد ملی قبلاً ثبت شده است.' };
      }

      // فقط کارآموز می‌تونه ثبت‌نام کنه
      var role = 'student';

      var user = {
        id: 'u_' + Date.now(),
        fullName: data.fullName ? data.fullName.trim() : '',
        email: data.email ? data.email.trim().toLowerCase() : '',
        password: data.password || '',
        role: role,
        phone: data.phone || '',
        gender: data.gender || '',
        fatherName: data.fatherName || '',
        nationalCode: data.nationalCode || '',
        bio: '', avatar: '', university: '', specialty: '',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isActive: true
      };

      users.push(user);
      localStorage.setItem('aoura_users', JSON.stringify(users));

      var safeUser = this._stripPassword(user);
      this.setCurrentUser(safeUser);
      localStorage.setItem('aoura_token', 'token_' + Date.now());
      return { success: true, user: safeUser };
    },

    login: function (email, password) {
      var users = JSON.parse(localStorage.getItem('aoura_users') || '[]');
      var user = users.find(function (u) {
        return u.email.toLowerCase() === email.toLowerCase() && u.password === password;
      });

      if (!user) {
        // ادمین پیش‌فرض
        if (email === 'aoura@admin.ir' && password === 'admin123') {
          var admin = {
            id: 'admin-1', fullName: 'مدیر آئورا', email: 'aoura@admin.ir',
            role: 'admin', phone: '', gender: '', fatherName: '', nationalCode: '',
            bio: 'مدیر اصلی پلتفرم آئورا', avatar: '', university: 'آئورا',
            specialty: 'مدیریت', createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(), isActive: true
          };
          this.setCurrentUser(admin);
          localStorage.setItem('aoura_token', 'admin_token_' + Date.now());
          return { success: true, user: admin };
        }
        return { success: false, message: 'ایمیل یا رمز عبور اشتباه است.' };
      }

      user.lastLoginAt = new Date().toISOString();
      var idx = users.findIndex(function (u) { return u.id === user.id; });
      if (idx >= 0) users[idx] = user;
      localStorage.setItem('aoura_users', JSON.stringify(users));

      var safeUser = this._stripPassword(user);
      this.setCurrentUser(safeUser);
      localStorage.setItem('aoura_token', 'token_' + Date.now());
      return { success: true, user: safeUser };
    },

    logout: function () {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('aoura_token');
      $('body').removeClass('user-admin user-professor user-student');
      this.updateUI();
      window.location.href = 'index.html';
    },

    updateProfile: function (updates) {
      var user = this.getCurrentUser();
      if (!user) return false;
      Object.assign(user, updates);
      this.setCurrentUser(user);
      var users = JSON.parse(localStorage.getItem('aoura_users') || '[]');
      var idx = users.findIndex(function (u) { return u.id === user.id; });
      if (idx >= 0) { Object.assign(users[idx], updates); localStorage.setItem('aoura_users', JSON.stringify(users)); }
      return true;
    },

    updateUI: function () {
      var $area = $('#authArea');
      if (!$area.length) return;
      var user = this.getCurrentUser();

      if (user) {
        var initials = this._getInitials(user.fullName);
        var dashLink = user.role === 'admin' ? 'dashboard-admin.html' :
                       user.role === 'professor' ? 'dashboard-professor.html' :
                       'dashboard-student.html';

        $area.html(
          '<div class="user-menu">' +
          '<button class="user-btn" id="userMenuBtn">' +
          '<span class="user-avatar-sm">' + initials + '</span>' +
          '<span class="user-name-sm">' + (user.fullName.split(' ')[0]) + '</span>' +
          '<span class="arrow-down">▾</span></button>' +
          '<div class="user-dropdown" id="userDropdown">' +
          '<a href="' + dashLink + '">📊 داشبورد من</a>' +
          '<a href="' + dashLink + '#profile">👤 پروفایل</a>' +
          (user.role === 'admin' ? '<a href="surveys.html">📋 نظرسنجی‌ساز</a><a href="meetings.html">📹 جلسات</a>' : '') +
          '<hr style="border:none;border-top:1px solid var(--border);margin:.35rem 0">' +
          '<a href="#" id="logoutBtn" style="color:#e74c3c">🚪 خروج</a>' +
          '</div></div>'
        );

        $('#userMenuBtn').off('click.aora').on('click.aora', function (e) {
          e.stopPropagation();
          $('#userDropdown').toggleClass('open');
        });
        $(document).off('click.aoraDropdown').on('click.aoraDropdown', function () {
          $('#userDropdown').removeClass('open');
        });
        $('#logoutBtn').off('click.aora').on('click.aora', function (e) { e.preventDefault(); Auth.logout(); });
      } else {
        $area.html(
          '<a href="login.html" class="btn-ghost" style="padding:.4rem .8rem;font-size:.75rem">ورود</a>' +
          '<a href="register.html" class="btn-primary" style="padding:.4rem .8rem;font-size:.75rem">ثبت‌نام</a>'
        );
      }
    },

    _stripPassword: function (user) {
      var copy = {};
      for (var key in user) { if (user.hasOwnProperty(key) && key !== 'password') copy[key] = user[key]; }
      return copy;
    },

    _getInitials: function (name) {
      if (!name) return '؟';
      var parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
      return name.charAt(0) + (name.charAt(1) || '');
    }
  };

  window.Auth = Auth;
  Auth.updateUI();

  var currentUser = Auth.getCurrentUser();
  if (currentUser) $('body').addClass('user-' + currentUser.role);


  /* ═══════════════════════════════════════════
     فرم ثبت‌نام
     ═══════════════════════════════════════════ */
  $('#registerForm').on('submit', function (e) {
    e.preventDefault();
    var $f = $(this), $msg = $('#registerMsg');

    var fullName     = $f.find('[name="fullName"]').val().trim();
    var email        = $f.find('[name="email"]').val().trim();
    var password     = $f.find('[name="password"]').val();
    var confirm      = $f.find('[name="confirmPassword"]').val();
    var phone        = $f.find('[name="phone"]').val().trim();
    var gender       = $f.find('[name="gender"]').val();
    var fatherName   = $f.find('[name="fatherName"]').val().trim();
    var nationalCode = $f.find('[name="nationalCode"]').val().trim();

    if (!fullName) { $msg.css('color','#e74c3c').text('نام الزامی است.'); return; }
    if (!email) { $msg.css('color','#e74c3c').text('ایمیل الزامی است.'); return; }
    if (!gender) { $msg.css('color','#e74c3c').text('جنسیت را انتخاب کنید.'); return; }
    if (!phone) { $msg.css('color','#e74c3c').text('موبایل الزامی است.'); return; }
    if (!fatherName) { $msg.css('color','#e74c3c').text('نام پدر الزامی است.'); return; }
    if (!nationalCode || nationalCode.length !== 10) { $msg.css('color','#e74c3c').text('کد ملی ۱۰ رقمی.'); return; }
    if (!password) { $msg.css('color','#e74c3c').text('رمز الزامی است.'); return; }
    if (password.length < 6) { $msg.css('color','#e74c3c').text('رمز حداقل ۶ کاراکتر.'); return; }
    if (password !== confirm) { $msg.css('color','#e74c3c').text('رمز و تکرار مطابقت ندارند.'); return; }

    var result = Auth.register({
      fullName: fullName, email: email, password: password,
      phone: phone, gender: gender, fatherName: fatherName, nationalCode: nationalCode
    });

    if (result.success) {
      $msg.css('color','var(--accent)').text('ثبت‌نام موفق! در حال انتقال...');
      setTimeout(function () {
        var redirect = new URLSearchParams(window.location.search).get('redirect');
        window.location.href = redirect ? decodeURIComponent(redirect) : 'dashboard-student.html';
      }, 800);
    } else {
      $msg.css('color','#e74c3c').text(result.message);
    }
  });


  /* ═══════════════════════════════════════════
     فرم ورود
     ═══════════════════════════════════════════ */
  $('#loginForm').on('submit', function (e) {
    e.preventDefault();
    var email = $(this).find('[name="email"]').val().trim();
    var password = $(this).find('[name="password"]').val();
    var $msg = $('#loginMsg');

    if (!email || !password) { $msg.css('color','#e74c3c').text('ایمیل و رمز را وارد کنید.'); return; }

    var result = Auth.login(email, password);

    if (result.success) {
      $msg.css('color','var(--accent)').text('ورود موفق! خوش آمدید ' + result.user.fullName.split(' ')[0]);
      setTimeout(function () {
        var redirect = new URLSearchParams(window.location.search).get('redirect');
        if (redirect) { window.location.href = decodeURIComponent(redirect); }
        else {
          var m = { admin: 'dashboard-admin.html', professor: 'dashboard-professor.html', student: 'dashboard-student.html' };
          window.location.href = m[result.user.role] || 'dashboard-student.html';
        }
      }, 800);
    } else {
      $msg.css('color','#e74c3c').text(result.message);
    }
  });


  /* ═══════════════════════════════════════════
     Cart
     ═══════════════════════════════════════════ */
  var Cart = {
    STORAGE_KEY: 'aoura_cart',
    getItems: function () { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'); },
    addItem: function (id) { var items = this.getItems(); if (items.indexOf(id) >= 0) return false; items.push(id); localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items)); this.updateBadge(); return true; },
    removeItem: function (id) { var items = this.getItems().filter(function (i) { return i !== id; }); localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items)); this.updateBadge(); },
    hasItem: function (id) { return this.getItems().indexOf(id) >= 0; },
    getCount: function () { return this.getItems().length; },
    getTotal: function () { var t = 0; var cs = JSON.parse(localStorage.getItem('aora_courses') || '[]'); this.getItems().forEach(function (id) { var c = cs.find(function (x) { return x.id === id; }); if (c) t += c.price; }); return t; },
    clear: function () { localStorage.setItem(this.STORAGE_KEY, '[]'); this.updateBadge(); },
    updateBadge: function () { $('#cartCount').text(this.getCount()); }
  };
  Cart.updateBadge();
  window.Cart = Cart;


  /* ═══════════════════════════════════════════
     Payment / Enrollment
     ═══════════════════════════════════════════ */
  var Payment = {
    STORAGE_KEY: 'aoura_enrollments',
    isEnrolled: function (cid) { var u = Auth.getCurrentUser(); if (!u) return false; return this._getAll().some(function (e) { return e.courseId === cid && e.userId === u.id; }); },
    enroll: function (cid, cname, amount) { var u = Auth.getCurrentUser(); if (!u) return false; var all = this._getAll(); if (all.some(function (e) { return e.courseId === cid && e.userId === u.id; })) return false; all.push({ courseId: cid, courseName: cname, userId: u.id, userName: u.fullName, enrolledAt: new Date().toISOString(), amount: amount || 0, progress: 0, completedLessons: [] }); localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all)); Cart.removeItem(cid); return true; },
    getMyEnrollments: function () { var u = Auth.getCurrentUser(); if (!u) return []; return this._getAll().filter(function (e) { return e.userId === u.id; }); },
    _getAll: function () { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'); }
  };
  window.Payment = Payment;


  /* ═══════════════════════════════════════════
     Notification
     ═══════════════════════════════════════════ */
  window.showNotification = function (message, type) {
    var bc = type === 'error' ? '#e74c3c' : 'var(--accent)';
    var $n = $('<div style="position:fixed;top:90px;left:50%;transform:translateX(-50%);background:var(--bg-card);border:1px solid ' + bc + ';border-radius:10px;padding:.75rem 1.5rem;font-size:.82rem;color:var(--text-primary);z-index:10000;box-shadow:0 8px 32px rgba(0,0,0,.4);opacity:0;transition:opacity .3s;direction:rtl">' + message + '</div>');
    $('body').append($n);
    setTimeout(function () { $n.css('opacity','1'); }, 50);
    setTimeout(function () { $n.css('opacity','0'); setTimeout(function () { $n.remove(); }, 300); }, 3000);
  };


  /* ═══════════════════════════════════════════
     Helpers
     ═══════════════════════════════════════════ */
  window.toPersianNum = function (num) {
    var p = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    return String(num).replace(/\d/g, function (d) { return p[parseInt(d)]; });
  };
  window.formatPrice = function (a) { return a.toLocaleString('fa-IR') + ' تومان'; };
  window.getPersianDate = function () { return new Date().toLocaleDateString('fa-IR'); };
  $('.current-date').text(getPersianDate());

});