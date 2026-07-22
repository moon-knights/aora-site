var API = (function () {
  var config = {
    baseUrl: '', 
    demoMode: true, 
    demoDelay: 600,
    token: null
  };

  // ... (توابع setToken, getToken و ... که قبلاً درست بودن) ...

  /* ── ذخیره توکن ── */
  function setToken(token) {
    config.token = token;
    localStorage.setItem('aoura_token', token);
  }

  function getToken() {
    if (!config.token) {
      config.token = localStorage.getItem('aoura_token');
    }
    return config.token;
  }

  function clearToken() {
    config.token = null;
    localStorage.removeItem('aoura_token');
  }

  /* ── درخواست اصلی AJAX ── */
  function request(method, endpoint, data, options) {
    options = options || {};
    var deferred = $.Deferred();

    // در حالت دمو
    if (config.demoMode) {
      setTimeout(function () {
        var result = demoHandler(method, endpoint, data);
        if (result.success) {
          deferred.resolve(result.data);
        } else {
          deferred.reject(result.message || 'خطای ناشناخته');
        }
      }, options.noDelay ? 0 : config.demoDelay);
      return deferred.promise();
    }

    // درخواست واقعی
    var ajaxOptions = {
      url: config.baseUrl + endpoint,
      method: method,
      contentType: 'application/json',
      dataType: 'json',
      timeout: 30000,
      headers: {}
    };

    // اضافه کردن توکن
    var token = getToken();
    if (token) {
      ajaxOptions.headers['Authorization'] = 'Bearer ' + token;
    }

    // ارسال داده
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      ajaxOptions.data = JSON.stringify(data);
    }

    // ارسال پارامترهای GET
    if (data && method === 'GET') {
      ajaxOptions.data = data;
    }

    $.ajax(ajaxOptions)
      .done(function (response) {
        if (response.success !== false) {
          deferred.resolve(response);
        } else {
          deferred.reject(response.message || 'خطای سرور');
        }
      })
      .fail(function (xhr) {
        var msg = 'خطا در ارتباط با سرور.';
        if (xhr.status === 401) {
          msg = 'نشست شما منقضی شده. لطفاً دوباره وارد شوید.';
          clearToken();
          if (!options.noRedirect) {
            window.location.href = '/login';
          }
        } else if (xhr.status === 403) {
          msg = 'شما اجازه دسترسی به این بخش را ندارید.';
        } else if (xhr.status === 404) {
          msg = 'موردی یافت نشد.';
        } else if (xhr.responseJSON && xhr.responseJSON.message) {
          msg = xhr.responseJSON.message;
        }
        deferred.reject(msg);
      });

    return deferred.promise();
  }

  /* ── متدهای کوتاه ── */
  function get(endpoint, params, options) {
    return request('GET', endpoint, params, options);
  }
  function post(endpoint, data, options) {
    return request('POST', endpoint, data, options);
  }
  function put(endpoint, data, options) {
    return request('PUT', endpoint, data, options);
  }
  function del(endpoint, options) {
    return request('DELETE', endpoint, null, options);
  }

  /* ═══════════════════════════════════════════
     شبیه‌ساز سرور (Demo Handler)
     در حالت دمو تمام درخواست‌ها اینجا پردازش می‌شن
     ═══════════════════════════════════════════ */

  function demoHandler(method, endpoint, data) {

    var adminOnlyEndpoints = [
      { pattern: /^\/surveys/,        name: 'نظرسنجی‌ساز' },
      { pattern: /^\/meetings/,       name: 'جلسات مجازی' },
      { pattern: /^\/admin/,          name: 'پنل مدیریت' }
    ];

    for (var i = 0; i < adminOnlyEndpoints.length; i++) {
      var rule = adminOnlyEndpoints[i];
      if (rule.pattern.test(endpoint)) {
        var currentUser = null;
        try {
          var raw = localStorage.getItem('aoura_user');
          if (raw && raw !== 'undefined') currentUser = JSON.parse(raw);
        } catch (e) {}

        if (!currentUser || currentUser.role !== 'admin') {
          return {
            success: false,
            message: 'دسترسی به ' + rule.name + ' فقط برای مدیر سایت مجاز است.'
          };
        }
      }
    }

    /* ── احراز هویت ── */
    if (endpoint === '/auth/register' && method === 'POST') {
      var users = JSON.parse(localStorage.getItem('aoura_users') || '[]');
      var exists = users.find(function (u) { return u.email === data.email; });
      if (exists) return { success: false, message: 'این ایمیل قبلاً ثبت شده.' };
      var user = {
        id: 'u_' + Date.now(),
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role || 'student',
        phone: data.phone || '',
        avatar: '',
        bio: '',
        createdAt: new Date().toISOString()
      };
      users.push(user);
      localStorage.setItem('aoura_users', JSON.stringify(users));
      var token = 'demo_token_' + Date.now();
      setToken(token);
      return { success: true, data: { user: user, token: token } };
    }

    if (endpoint === '/auth/login' && method === 'POST') {
      var users = JSON.parse(localStorage.getItem('aoura_users') || '[]');
      var user = users.find(function (u) {
        return u.email === data.email && u.password === data.password;
      });
      if (!user) return { success: false, message: 'ایمیل یا رمز عبور اشتباه.' };
      var token = 'demo_token_' + Date.now();
      setToken(token);
      return { success: true, data: { user: user, token: token } };
    }

    if (endpoint === '/auth/me' && method === 'GET') {
      var current = JSON.parse(localStorage.getItem('aoura_user') || 'null');
      if (!current) return { success: false, message: 'وارد نشده‌اید.' };
      return { success: true, data: current };
    }

    /* ── دوره‌ها ── */
    if (endpoint === '/courses' && method === 'GET') {
      var courses = JSON.parse(localStorage.getItem('aora_courses') || '[]');
      if (!courses.length) {
        courses = getDefaultCourses();
        localStorage.setItem('aora_courses', JSON.stringify(courses));
      }
      // فقط دوره‌های منتشر شده یا بدون وضعیت (پیش‌فرض)
      courses = courses.filter(function(c) { return !c.status || c.status === 'published'; });
      // فیلتر
      if (data) {
        if (data.category && data.category !== 'all') {
          courses = courses.filter(function (c) { return c.category === data.category; });
        }
        if (data.level && data.level !== 'all') {
          courses = courses.filter(function (c) { return c.level === data.level; });
        }
        if (data.q) {
          var q = data.q.toLowerCase();
          courses = courses.filter(function (c) {
            return c.title.toLowerCase().indexOf(q) >= 0 ||
              c.instructor.toLowerCase().indexOf(q) >= 0;
          });
        }
      }
      return { success: true, data: courses };
    }

    if (endpoint.match(/^\/courses\/.+/) && method === 'GET') {
      var id = endpoint.split('/')[2];
      var courses = JSON.parse(localStorage.getItem('aora_courses') || '[]');
      var course = courses.find(function (c) { return c.id === id; });
      if (!course) return { success: false, message: 'دوره یافت نشد.' };
      return { success: true, data: course };
    }

    /* ── اساتید ── */
    if (endpoint === '/professors' && method === 'GET') {
      var defaultProfs = getDefaultProfessors();
      var allUsers = JSON.parse(localStorage.getItem('aoura_users') || '[]');
      var allCourses = JSON.parse(localStorage.getItem('aora_courses') || '[]');

      // اساتیدی که ادمین از پنل مدیریت کاربران اضافه کرده (role === 'professor')
      var registeredProfs = allUsers.filter(function (u) { return u.role === 'professor'; }).map(function (u) {
        var theirCourses = allCourses.filter(function (c) {
          return c.instructorId === u.id || c.instructor === u.fullName;
        });
        var totalStudents = theirCourses.reduce(function (s, c) { return s + (c.students || 0); }, 0);
        return {
          id: u.id,
          name: u.fullName,
          title: u.specialty || 'استاد',
          university: u.university || '',
          specialty: u.specialty || '',
          courses: theirCourses.length,
          students: totalStudents,
          rating: 0,
          publications: 0,
          hIndex: 0,
          email: u.email,
          bio: u.bio || '',
          avatar: u.avatar || ''
        };
      });

      // جلوگیری از نمایش تکراری در صورتی که یک استاد دمو با همون ایمیل واقعاً ثبت‌نام کرده باشد
      var registeredEmails = registeredProfs.map(function (p) { return p.email; });
      var merged = defaultProfs.filter(function (p) { return registeredEmails.indexOf(p.email) < 0; }).concat(registeredProfs);

      return { success: true, data: merged };
    }

    /* ── کارآموزان ── */
    if (endpoint === '/students' && method === 'GET') {
      var users = JSON.parse(localStorage.getItem('aoura_users') || '[]');
      var students = users.filter(function (u) { return u.role === 'student'; });
      return { success: true, data: students };
    }

    /* ── تالار گفتگو ── */
    if (endpoint === '/forum' && method === 'GET') {
      var posts = JSON.parse(localStorage.getItem('aora_forum') || '[]');
      if (!posts.length) {
        posts = getDefaultForumPosts();
        localStorage.setItem('aora_forum', JSON.stringify(posts));
      }
      return { success: true, data: posts };
    }

    if (endpoint === '/forum' && method === 'POST') {
      var posts = JSON.parse(localStorage.getItem('aora_forum') || '[]');
      var user = JSON.parse(localStorage.getItem('aoura_user') || '{}');
      var post = {
        id: 'fp_' + Date.now(),
        title: data.title,
        content: data.content,
        category: data.category || 'عمومی',
        author: user.fullName || 'ناشناس',
        authorRole: user.role || 'student',
        replies: [],
        likes: 0,
        views: 0,
        createdAt: new Date().toISOString()
      };
      posts.unshift(post);
      localStorage.setItem('aora_forum', JSON.stringify(posts));
      return { success: true, data: post };
    }

    /* ── نظرسنجی‌ها ── */
    if (endpoint === '/surveys' && method === 'GET') {
      return { success: true, data: JSON.parse(localStorage.getItem('aora_surveys') || '[]') };
    }

    if (endpoint === '/surveys' && method === 'POST') {
      var surveys = JSON.parse(localStorage.getItem('aora_surveys') || '[]');
      data.id = 'sv_' + Date.now();
      data.createdAt = new Date().toISOString();
      data.status = 'active';
      surveys.unshift(data);
      localStorage.setItem('aora_surveys', JSON.stringify(surveys));
      return { success: true, data: data };
    }

    /* ── جلسات ── */
    if (endpoint === '/meetings' && method === 'GET') {
      return { success: true, data: JSON.parse(localStorage.getItem('aora_meetings') || '[]') };
    }

    if (endpoint === '/meetings' && method === 'POST') {
      var meetings = JSON.parse(localStorage.getItem('aora_meetings') || '[]');
      data.id = 'mt_' + Date.now();
      data.createdAt = new Date().toISOString();
      data.status = 'scheduled';
      meetings.unshift(data);
      localStorage.setItem('aora_meetings', JSON.stringify(meetings));
      return { success: true, data: data };
    }

    /* ── سبد خرید ── */
    if (endpoint === '/cart' && method === 'GET') {
      return { success: true, data: JSON.parse(localStorage.getItem('aoura_cart') || '[]') };
    }

    if (endpoint === '/cart/add' && method === 'POST') {
      var cart = JSON.parse(localStorage.getItem('aoura_cart') || '[]');
      if (cart.indexOf(data.courseId) < 0) cart.push(data.courseId);
      localStorage.setItem('aoura_cart', JSON.stringify(cart));
      return { success: true, data: cart };
    }

    if (endpoint === '/cart/remove' && method === 'POST') {
      var cart = JSON.parse(localStorage.getItem('aoura_cart') || '[]');
      cart = cart.filter(function (id) { return id !== data.courseId; });
      localStorage.setItem('aoura_cart', JSON.stringify(cart));
      return { success: true, data: cart };
    }

    /* ── پرداخت ── */
    if (endpoint === '/payment/request' && method === 'POST') {
      return {
        success: true,
        data: {
          authority: 'DEMO_' + Date.now(),
          paymentUrl: 'payment-callback?Status=OK&Authority=DEMO_' + Date.now()
        }
      };
    }

    if (endpoint === '/payment/verify' && method === 'POST') {
      return { success: true, data: { refId: Math.floor(Math.random() * 9999999999) } };
    }

    /* ── ادمین ── */
    if (endpoint === '/admin/stats' && method === 'GET') {
      var users = JSON.parse(localStorage.getItem('aoura_users') || '[]');
      var courses = JSON.parse(localStorage.getItem('aora_courses') || '[]');
      var surveys = JSON.parse(localStorage.getItem('aora_surveys') || '[]');
      var meetings = JSON.parse(localStorage.getItem('aora_meetings') || '[]');
      return {
        success: true,
        data: {
          totalUsers: users.length,
          totalStudents: users.filter(function (u) { return u.role === 'student'; }).length,
          totalProfessors: users.filter(function (u) { return u.role === 'professor'; }).length,
          totalCourses: courses.length,
          totalSurveys: surveys.length,
          totalMeetings: meetings.length,
          totalRevenue: 24600000
        }
      };
    }

    if (endpoint === '/admin/users' && method === 'GET') {
      return { success: true, data: JSON.parse(localStorage.getItem('aoura_users') || '[]') };
    }

    if (endpoint.match(/^\/admin\/users\/.+/) && method === 'DELETE') {
      var uid = endpoint.split('/')[3];
      var users = JSON.parse(localStorage.getItem('aoura_users') || '[]');
      users = users.filter(function (u) { return u.id !== uid; });
      localStorage.setItem('aoura_users', JSON.stringify(users));
      return { success: true, data: null };
    }

    return { success: false, message: '.endpoint ناشناخته: ' + endpoint };
  }


  /* ═══════════════════════════════════════════
     داده‌های پیش‌فرض
     ═══════════════════════════════════════════ */

  function getDefaultCourses() {
    return [
      { id: 'content-production', title: 'اصول تولید محتوای دیجیتال', instructor: 'دکتر سارا احمدی', instructorId: 'prof-1', price: 2400000, originalPrice: 3200000, level: 'متوسط', duration: '۱۲ هفته', students: 342, rating: 4.8, category: 'تولید محتوا', icon: '🎬', image: 'images/content.jpg', description: 'آموزش جامع تولید محتوای تصویری و نوشتاری برای پلتفرم‌های آنلاین.', chapters: [{ title: 'ایده‌پردازی', lessons: 4 }, { title: 'فیلم‌برداری', lessons: 5 }, { title: 'تدوین', lessons: 4 }], tags: ['محتوا', 'ویدیو', 'نوشتار'], featured: true },
      { id: 'film-directing', title: 'کارگردانی و تدوین فیلم', instructor: 'دکتر مریم نوری', instructorId: 'prof-3', price: 3600000, originalPrice: 4500000, level: 'پیشرفته', duration: '۱۶ هفته', students: 187, rating: 4.9, category: 'فیلم و مستند', icon: '🎥', image: 'images/film.jpg', description: 'آموزش عملی کارگردانی، فیلم‌برداری و تدوین حرفه‌ای فیلم و مستند.', chapters: [{ title: 'مبانی کارگردانی', lessons: 5 }, { title: 'فیلم‌برداری', lessons: 4 }, { title: 'تدوین', lessons: 5 }], tags: ['کارگردانی', 'تدوین', 'فیلم'], featured: true },
      { id: 'project-management', title: 'مدیریت پروژه پیشرفته', instructor: 'دکتر علی رضایی', instructorId: 'prof-2', price: 2800000, originalPrice: 3500000, level: 'متوسط', duration: '۱۰ هفته', students: 256, rating: 4.7, category: 'مدیریت پروژه', icon: '📋', image: 'images/pm.jpg', description: 'آموزش مدیریت و اجرای پروژه‌های تخصصی با استانداردهای بین‌المللی.', chapters: [{ title: 'برنامه‌ریزی', lessons: 4 }, { title: 'اجرا', lessons: 4 }, { title: 'کنترل', lessons: 3 }], tags: ['مدیریت', 'PMP', 'اسکرام'], featured: false },
      { id: 'graphic-design', title: 'طراحی گرافیک و هویت بصری', instructor: 'دکتر محمد کاظمی', instructorId: 'prof-4', price: 3200000, originalPrice: 4000000, level: 'پیشرفته', duration: '۱۴ هفته', students: 198, rating: 4.6, category: 'طراحی', icon: '🎨', image: 'images/design.jpg', description: 'آموزش طراحی گرافیک، موشن‌گرافیک و هویت بصری برای برندها.', chapters: [{ title: 'مبانی طراحی', lessons: 5 }, { title: 'رنگ‌شناسی', lessons: 4 }, { title: 'موشن‌گرافیک', lessons: 5 }], tags: ['فتوشاپ', 'ایلاستریتور', 'موشن'], featured: true },
      { id: 'sound-design', title: 'صداگذاری و میکس صوتی', instructor: 'دکتر فاطمه عباسی', instructorId: 'prof-5', price: 1800000, originalPrice: 2500000, level: 'مبتدی', duration: '۸ هفته', students: 412, rating: 4.5, category: 'صداگذاری', icon: '🎙', image: 'images/sound.jpg', description: 'آموزش ضبط، ویرایش و میکس صدا برای فیلم، پادکست و موسیقی.', chapters: [{ title: 'مبانی صدا', lessons: 3 }, { title: 'ضبط', lessons: 4 }, { title: 'میکس', lessons: 4 }], tags: ['صدا', 'میکس', 'پادکست'], featured: false },
      { id: 'documentary', title: 'تولید مستند حرفه‌ای', instructor: 'دکتر حسن شریفی', instructorId: 'prof-6', price: 2600000, originalPrice: 3300000, level: 'متوسط', duration: '۱۰ هفته', students: 145, rating: 4.7, category: 'فیلم و مستند', icon: '🎬', image: 'images/doc.jpg', description: 'از ایده‌پردازی تا اکران؛ آموزش کامل تولید مستند حرفه‌ای.', chapters: [{ title: 'ایده و تحقیق', lessons: 4 }, { title: 'فیلم‌برداری', lessons: 4 }, { title: 'تدوین و روایت', lessons: 4 }], tags: ['مستند', 'روایت', 'فیلم‌برداری'], featured: false },
      { id: 'data-science', title: 'علم داده و تحلیل داده', instructor: 'دکتر رضا قاسمی', instructorId: 'prof-7', price: 3800000, originalPrice: 4800000, level: 'پیشرفته', duration: '۱۴ هفته', students: 89, rating: 4.9, category: 'علم داده', icon: '📊', image: 'images/data.jpg', description: 'تحلیل داده‌ها و یادگیری ماشین با Python و R برای پروژه‌های واقعی.', chapters: [{ title: 'Python', lessons: 4 }, { title: 'تحلیل داده', lessons: 5 }, { title: 'یادگیری ماشین', lessons: 5 }], tags: ['Python', 'R', 'ML'], featured: true },
      { id: 'photography', title: 'عکاسی حرفه‌ای', instructor: 'دکتر نگار محمدی', instructorId: 'prof-8', price: 2900000, originalPrice: 3700000, level: 'متوسط', duration: '۱۰ هفته', students: 167, rating: 4.6, category: 'عکاسی', icon: '📸', image: 'images/photo.jpg', description: 'آموزش عکاسی تبلیغاتی، مستند و هنری با تجهیزات حرفه‌ای.', chapters: [{ title: 'مبانی عکاسی', lessons: 3 }, { title: 'نورپردازی', lessons: 5 }, { title: 'ویرایش', lessons: 4 }], tags: ['عکاسی', 'نور', 'لایتروم'], featured: false },
      { id: 'digital-marketing', title: 'بازاریابی دیجیتال', instructor: 'دکتر امیر حسینی', instructorId: 'prof-9', price: 1500000, originalPrice: 2000000, level: 'مبتدی', duration: '۶ هفته', students: 523, rating: 4.4, category: 'بازاریابی', icon: '📈', image: 'images/marketing.jpg', description: 'استراتژی بازاریابی دیجیتال، سئو، شبکه‌های اجتماعی و تبلیغات آنلاین.', chapters: [{ title: 'استراتژی', lessons: 4 }, { title: 'سئو', lessons: 4 }, { title: 'شبکه‌های اجتماعی', lessons: 4 }], tags: ['سئو', 'اینستاگرام', 'تبلیغات'], featured: false },
      { id: 'python-dev', title: 'برنامه‌نویسی پایتون', instructor: 'دکتر سارا احمدی', instructorId: 'prof-1', price: 1200000, originalPrice: 1800000, level: 'مبتدی', duration: '۸ هفته', students: 687, rating: 4.7, category: 'برنامه‌نویسی', icon: '🐍', image: 'images/python.jpg', description: 'آموزش پایتون از صفر تا ساخت پروژه‌های واقعی.', chapters: [{ title: 'مبانی پایتون', lessons: 5 }, { title: 'کتابخانه‌ها', lessons: 5 }, { title: 'پروژه', lessons: 3 }], tags: ['پایتون', 'کدنویسی', 'اتوماسیون'], featured: true },
      { id: 'video-editing', title: 'تدوین حرفه‌ای ویدیو', instructor: 'دکتر زهرا کریمی', instructorId: 'prof-10', price: 2200000, originalPrice: 2800000, level: 'متوسط', duration: '۱۰ هفته', students: 234, rating: 4.5, category: 'تدوین', icon: '🎞', image: 'images/editing.jpg', description: 'آموزش تدوین حرفه‌ای با Premiere و DaVinci Resolve برای فیلم و محتوا.', chapters: [{ title: 'مبانی تدوین', lessons: 4 }, { title: 'جلوه‌ها', lessons: 4 }, { title: 'کالرگریدینگ', lessons: 3 }], tags: ['پریمیر', 'داوینچی', 'تدوین'], featured: false },
      { id: 'image-analysis', title: 'پردازش تصویر و جلوه‌های ویژه', instructor: 'دکتر بهرام راد', instructorId: 'prof-11', price: 2700000, originalPrice: 3400000, level: 'پیشرفته', duration: '۱۲ هفته', students: 112, rating: 4.8, category: 'پردازش تصویر', icon: '🖼', image: 'images/vfx.jpg', description: 'جلوه‌های ویژه بصری و پردازش تصویر با هوش مصنوعی.', chapters: [{ title: 'مبانی', lessons: 4 }, { title: 'جلوه‌ها', lessons: 5 }, { title: 'AI', lessons: 4 }], tags: ['VFX', 'افترافکت', 'AI'], featured: false }
    ];
  }

  function getDefaultProfessors() {
    return [
      { id: 'prof-1', name: 'دکتر سارا احمدی', title: 'مدیر تولید محتوا', university: 'آئورا', specialty: 'تولید محتوای آموزشی و دیجیتال', courses: 2, students: 1029, rating: 4.8, publications: 12, hIndex: 5, email: 's.ahmadi@aora.ir', bio: 'متخصص تولید محتوای آموزشی با بیش از ۱۵ سال تجربه در طراحی و اجرای دوره‌های تخصصی.', avatar: '' },
      { id: 'prof-2', name: 'دکتر علی رضایی', title: 'مدیر پروژه', university: 'آئورا', specialty: 'مدیریت پروژه و مشاوره', courses: 1, students: 187, rating: 4.9, publications: 8, hIndex: 4, email: 'a.rezaei@aora.ir', bio: 'متخصص مدیریت و اجرای پروژه‌های تخصصی با تجربه بین‌المللی و مدرک PMP.', avatar: '' },
      { id: 'prof-3', name: 'دکتر مریم نوری', title: 'مدیر تولید فیلم', university: 'آئورا', specialty: 'کارگردانی و تدوین فیلم', courses: 1, students: 256, rating: 4.7, publications: 5, hIndex: 3, email: 'm.nouri@aora.ir', bio: 'کارگردان و تدوینگر با تجربه تولید بیش از ۲۰ فیلم و مستند حرفه‌ای.', avatar: '' },
      { id: 'prof-4', name: 'دکتر محمد کاظمی', title: 'مدیر فنی و توسعه', university: 'آئورا', specialty: 'طراحی گرافیک و توسعه وب', courses: 1, students: 198, rating: 4.6, publications: 6, hIndex: 3, email: 'm.kazemi@aora.ir', bio: 'توسعه‌دهنده و طراح با تخصص در پلتفرم‌های آنلاین و هویت بصری برندها.', avatar: '' },
      { id: 'prof-5', name: 'دکتر فاطمه عباسی', title: 'متخصص صداگذاری', university: 'آئورا', specialty: 'صداگذاری و میکس صوتی', courses: 1, students: 412, rating: 4.5, publications: 3, hIndex: 2, email: 'f.abbasi@aora.ir', bio: 'متخصص صداگذاری و میکس با بیش از ۱۰ سال تجربه در تولید فیلم و پادکست.', avatar: '' },
      { id: 'prof-6', name: 'دکتر حسن شریفی', title: 'کارگردان مستند', university: 'آئورا', specialty: 'تولید مستند و فیلم‌برداری', courses: 1, students: 145, rating: 4.7, publications: 4, hIndex: 2, email: 'h.sharifi@aora.ir', bio: 'کارگردان مستند با تجربه حضور در جشنواره‌های بین‌المللی فیلم.', avatar: '' }
    ];
  }

  function getDefaultForumPosts() {
    return [
      { id: 'fp_1', title: 'بهترین نرم‌افزار تدوین برای مبتدی‌ها؟', content: 'سلام. می‌خوام تدوین رو شروع کنم. بهترین نرم‌افزار چیه؟ Premiere یا DaVinci؟', category: 'تدوین', author: 'علی محمدی', authorRole: 'student', replies: [{ author: 'دکتر مریم نوری', text: 'برای شروع DaVinci Resolve رایگان و عالیه.', date: '۱۴۰۵/۰۲/۱۵' }], likes: 24, views: 156, createdAt: '2026-05-01T10:00:00Z' },
      { id: 'fp_2', title: 'مشکل در اتصال میکروفون به کامپیوتر', content: 'هنگام اتصال میکروفون خارجی صدا نمیاد. کسی می‌تونه کمک کنه؟', category: 'صداگذاری', author: 'زهرا کریمی', authorRole: 'student', replies: [], likes: 8, views: 89, createdAt: '2026-05-03T14:00:00Z' },
      { id: 'fp_3', title: 'فرصت شغلی: فیلم‌بردار حرفه‌ای', content: 'استودیو آئورا به یک فیلم‌بردار حرفه‌ای با تجربه کار با دوردرون نیاز دارد.', category: 'فرصت شغلی', author: 'دکتر علی رضایی', authorRole: 'professor', replies: [{ author: 'نیلوفر رضایی', text: 'سلام. شرایط همکاری چیه؟', date: '۱۴۰۵/۰۳/۰۱' }], likes: 45, views: 312, createdAt: '2026-04-28T09:00:00Z' },
      { id: 'fp_4', title: 'مقایسه Premiere و Final Cut', content: 'تفاوت اصلی Premiere و Final Cut چیه و کی از کدوم استفاده کنیم؟', category: 'تدوین', author: 'محمد حسینی', authorRole: 'student', replies: [], likes: 19, views: 134, createdAt: '2026-05-05T11:00:00Z' },
      { id: 'fp_5', title: 'کارگاه آنلاین: فیلم‌برداری با دوردرون', content: 'هفته آینده کارگاه آنلاینی درباره فیلم‌برداری هوایی با دوردرون برگزار می‌شه. همه دعوتن!', category: 'رویداد', author: 'دکتر مریم نوری', authorRole: 'professor', replies: [], likes: 67, views: 445, createdAt: '2026-05-02T16:00:00Z' }
    ];
  }

  /* ── API عمومی ── */
  return {
    get: get,
    post: post,
    put: put,
    del: del,
    setToken: setToken,
    getToken: getToken,
    clearToken: clearToken,
    config: config,
    getDefaultCourses: getDefaultCourses,
    getDefaultProfessors: getDefaultProfessors
  };

})