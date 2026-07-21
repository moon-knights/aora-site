/* ═══════════════════════════════════════════════════════════════════
   آئورا — app.js v5 (Google Auth یکپارچه)
   ═══════════════════════════════════════════════════════════════════ */
$(document).ready(function () {

  /* ═══ ناوبری ═══ */
  $(window).on('scroll', function () {
    if ($(this).scrollTop() > 50) $('#mainNav').addClass('scrolled');
    else $('#mainNav').removeClass('scrolled');
  });

  var currentPage = window.location.pathname.split('/').pop() || '/';
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
      window.location.href = '/';
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
        var dashLink = user.role === 'admin' ? '/dashboard-admin' :
                       user.role === 'professor' ? '/dashboard-professor' :
                       '/dashboard-student';

        $area.html(
          '<div class="user-menu">' +
          '<button class="user-btn" id="userMenuBtn">' +
          '<span class="user-avatar-sm">' + initials + '</span>' +
          '<span class="user-name-sm">' + (user.fullName.split(' ')[0]) + '</span>' +
          '<span class="arrow-down">▾</span></button>' +
          '<div class="user-dropdown" id="userDropdown">' +
          '<a href="' + dashLink + '">📊 داشبورد من</a>' +
          '<a href="' + dashLink + '#profile">👤 پروفایل</a>' +
          (user.role === 'admin' ? '<a href="/surveys">📋 نظرسنجی‌ساز</a><a href="/meetings">📹 جلسات</a>' : '') +
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
          '<a href="/login" class="btn-ghost" style="padding:.4rem .8rem;font-size:.75rem">ورود</a>' +
          '<a href="/register" class="btn-primary" style="padding:.4rem .8rem;font-size:.75rem">ثبت‌نام</a>'
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
     Google Sign-In (یکپارچه)
     ═══════════════════════════════════════════ */
  var GoogleAuth = {
    // ⚠️ این مقدار باید با Client ID واقعی شما جایگزین شود
    // از Google Cloud Console → APIs & Services → Credentials بسازید
    CLIENT_ID: '790544741196-85heqn7s4l7rp6722mtcq20bhg7or7mq.apps.googleusercontent.com',

    initialized: false,

    init: function () {
      if (this.initialized) return;
      if (typeof google === 'undefined' || !google.accounts) {
        console.warn('[GoogleAuth] Google Identity Services بارگذاری نشد.');
        this._showFallback();
        return;
      }

      if (this.CLIENT_ID.indexOf('YOUR_GOOGLE_CLIENT_ID') === 0) {
        console.warn('[GoogleAuth] Client ID تنظیم نشده! در حالت دمو کار می‌کند.');
        this._initDemoMode();
        return;
      }

      this._initReal();
      this.initialized = true;
    },

    /* حالت واقعی — با Google API */
    _initReal: function () {
      var self = this;
      google.accounts.id.initialize({
        client_id: self.CLIENT_ID,
        callback: function (response) { self._handleCredential(response); },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // رندر دکمه گوگل در هر دو صفحه
      var $btns = $('.btn-google');
      $btns.each(function () {
        var $btn = $(this);
        $btn.empty(); // حذف محتوای سفارشی
        google.accounts.id.renderButton(this, {
          theme: 'outline',
          size: 'large',
          text: $btn.attr('data-google-text') || 'continue_with',
          shape: 'rectangular',
          width: $btn.outerWidth(),
          logo_alignment: 'center'
        });
        $btn.css({ border: 'none', background: 'none', padding: '0' });
      });
    },

    /* حالت دمو — وقتی Client ID تنظیم نشده */
    _initDemoMode: function () {
      var self = this;
      $('.btn-google').each(function () {
        var $btn = $(this);
        $btn.off('click.googleDemo').on('click.googleDemo', function (e) {
          e.preventDefault();
          self._showDemoModal();
        });
      });
    },

    /* مودال دمو برای تست بدون Google API */
    _showDemoModal: function () {
      var self = this;
      if ($('#googleDemoModal').length) { $('#googleDemoModal').fadeIn(200); return; }

      var modal = $(
        '<div id="googleDemoModal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem">' +
          '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;max-width:400px;width:100%;direction:rtl">' +
            '<div style="text-align:center;margin-bottom:1.5rem">' +
              '<div style="font-size:2rem;margin-bottom:.5rem">🔐</div>' +
              '<h3 style="margin:0 0 .25rem;color:var(--text-primary)">ورود با گوگل (دمو)</h3>' +
              '<p style="font-size:.78rem;color:var(--text-muted);margin:0">ایمیل گوگل خود را وارد کنید</p>' +
            '</div>' +
            '<div class="auth-field">' +
              '<input type="email" id="demoGoogleEmail" placeholder="your-email@gmail.com" style="width:100%;padding:.65rem 1rem;background:var(--bg-deep);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-primary);font-size:.85rem;direction:ltr;text-align:left;outline:none" autocomplete="email">' +
            '</div>' +
            '<button id="demoGoogleSubmit" class="btn-primary" style="width:100%;justify-content:center;padding:.7rem;font-size:.85rem;margin-top:.5rem">ادامه</button>' +
            '<p id="demoGoogleMsg" style="text-align:center;font-size:.75rem;margin-top:.75rem;min-height:1.2rem;color:var(--text-muted)"></p>' +
            '<button id="demoGoogleClose" style="display:block;margin:0 auto;background:none;border:none;color:var(--text-muted);font-size:.75rem;cursor:pointer;font-family:var(--font-fa);margin-top:.5rem">انصراف</button>' +
          '</div>' +
        '</div>'
      );

      $('body').append(modal);
      modal.hide().fadeIn(200);

      // بستن
      modal.find('#demoGoogleClose').on('click', function () { modal.fadeOut(200, function () { modal.remove(); }); });
      modal.on('click', function (e) { if (e.target === this) modal.fadeOut(200, function () { modal.remove(); }); });

      // ارسال
      modal.find('#demoGoogleSubmit').on('click', function () {
        var email = modal.find('#demoGoogleEmail').val().trim();
        var $msg = modal.find('#demoGoogleMsg');

        if (!email || email.indexOf('@') < 1) {
          $msg.css('color', '#e74c3c').text('ایمیل معتبر وارد کنید.');
          return;
        }
        // فقط gmail یا googlemail
        if (!/@(gmail|googlemail)\.com$/i.test(email)) {
          $msg.css('color', '#e74c3c').text('لطفاً از ایمیل گوگل (gmail) استفاده کنید.');
          return;
        }

        $msg.css('color', 'var(--accent)').text('در حال پردازش...');
        self._processGoogleUser({
          email: email,
          name: email.split('@')[0].replace(/[._]/g, ' '),
          picture: ''
        });
      });

      // Enter
      modal.find('#demoGoogleEmail').on('keypress', function (e) {
        if (e.which === 13) modal.find('#demoGoogleSubmit').click();
      });
    },

    /* هندل credential واقعی از گوگل */
    _handleCredential: function (response) {
      try {
        var payload = JSON.parse(atob(response.credential.split('.')[1]));
        this._processGoogleUser({
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture || ''
        });
      } catch (e) {
        console.error('[GoogleAuth] خطا در decode:', e);
        showNotification('خطا در ورود با گوگل. لطفاً دوباره تلاش کنید.', 'error');
      }
    },

    /* پردازش نهایی کاربر گوگل — مشترک بین واقعی و دمو */
    _processGoogleUser: function (googleUser) {
      var users = JSON.parse(localStorage.getItem('aoura_users') || '[]');
      var existing = users.find(function (u) {
        return u.email.toLowerCase() === googleUser.email.toLowerCase();
      });

      if (existing) {
        // ── ورود ──
        existing.lastLoginAt = new Date().toISOString();
        existing.avatar = existing.avatar || googleUser.picture;
        var idx = users.findIndex(function (u) { return u.id === existing.id; });
        if (idx >= 0) users[idx] = existing;
        localStorage.setItem('aoura_users', JSON.stringify(users));

        Auth.setCurrentUser(Auth._stripPassword(existing));
        localStorage.setItem('aoura_token', 'google_' + Date.now());
        showNotification('خوش آمدید ' + existing.fullName.split(' ')[0] + '! 👋');
        setTimeout(function () {
          var m = { admin: '/dashboard-admin', professor: '/dashboard-professor', student: '/dashboard-student' };
          window.location.href = m[existing.role] || '/dashboard-student';
        }, 800);
      } else {
        // ── ثبت‌نام خودکار ──
        var result = Auth.register({
          fullName: googleUser.name,
          email: googleUser.email,
          password: 'google_' + Date.now(),
          role: 'student',
          avatar: googleUser.picture
        });
        if (result.success) {
          showNotification('ثبت‌نام با گوگل موفق! خوش آمدید 🎉');
          setTimeout(function () { window.location.href = '/dashboard-student'; }, 800);
        } else {
          showNotification(result.message, 'error');
        }
      }

      // بستن مودال دمو اگر بازه
      $('#googleDemoModal').fadeOut(200, function () { $(this).remove(); });
    },

    /* نمایش پیام خطا اگر Google API در دسترس نیست */
    _showFallback: function () {
      $('.btn-google').each(function () {
        var $btn = $(this);
        $btn.on('click', function () {
          showNotification('سرویس گوگل در دسترس نیست. لطفاً از فرم ورود/ثبت‌نام استفاده کنید.', 'error');
        });
      });
    }
  };

  window.GoogleAuth = GoogleAuth;
  // مقداردهی اولیه بعد از بارگذاری کامل صفحه
  $(window).on('load', function () { setTimeout(function () { GoogleAuth.init(); }, 500); });


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
        window.location.href = redirect ? decodeURIComponent(redirect) : '/dashboard-student';
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
          var m = { admin: '/dashboard-admin', professor: '/dashboard-professor', student: '/dashboard-student' };
          window.location.href = m[result.user.role] || '/dashboard-student';
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
    updateProgress: function (cid, lessonId, totalLessons) {
      var u = Auth.getCurrentUser();
      if (!u) return null;
      var all = this._getAll();
      var e = all.find(function (x) { return x.courseId === cid && x.userId === u.id; });
      if (!e) return null;
      e.completedLessons = e.completedLessons || [];
      if (e.completedLessons.indexOf(lessonId) < 0) e.completedLessons.push(lessonId);
      if (totalLessons > 0) {
        e.progress = Math.min(100, Math.round((e.completedLessons.length / totalLessons) * 100));
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
      return e;
    },
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