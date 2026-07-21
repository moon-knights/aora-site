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
            window.location.href = 'login.html';
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
          paymentUrl: 'payment-callback.html?Status=OK&Authority=DEMO_' + Date.now()
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
      { id: 'bio-computational', title: 'مبانی زیست‌شناسی محاسباتی', instructor: 'دکتر سارا احمدی', instructorId: 'prof-1', price: 2400000, originalPrice: 3200000, level: 'متوسط', duration: '۱۲ هفته', students: 342, rating: 4.8, category: 'زیست‌شناسی', icon: '🧬', image: 'images/bio.jpg', description: 'آشنایی با الگوریتم‌های محاسباتی در زیست‌شناسی مولکولی و تحلیل توالی.', chapters: [{ title: 'مقدمه', lessons: 4 }, { title: 'تحلیل توالی', lessons: 5 }, { title: 'مدل‌سازی', lessons: 4 }], tags: ['پایتون', 'بیوانفورماتیک', 'DNA'], featured: true },
      { id: 'bioinformatics-adv', title: 'بیوانفورماتیک پیشرفته', instructor: 'دکتر علی رضایی', instructorId: 'prof-2', price: 3600000, originalPrice: 4500000, level: 'پیشرفته', duration: '۱۶ هفته', students: 187, rating: 4.9, category: 'بیوانفورماتیک', icon: '🧫', image: 'images/bioinfo.jpg', description: 'تحلیل پیشرفته داده‌های ژنومیکس و پروتئومیکس با ابزارهای مدرن.', chapters: [{ title: 'ژنومیکس', lessons: 5 }, { title: 'پروتئومیکس', lessons: 4 }, { title: 'شبکه‌ها', lessons: 5 }], tags: ['R', 'ژنوم', 'پروتئین'], featured: true },
      { id: 'genetics', title: 'ژنتیک مولکولی پزشکی', instructor: 'دکتر مریم نوری', instructorId: 'prof-3', price: 2800000, originalPrice: 3500000, level: 'متوسط', duration: '۱۰ هفته', students: 256, rating: 4.7, category: 'ژنتیک', icon: '🔬', image: 'images/genetics.jpg', description: 'مبانی ژنتیک مولکولی، جهش‌ها و بیماری‌های ژنتیکی.', chapters: [{ title: 'ساختار ژن', lessons: 4 }, { title: 'جهش', lessons: 4 }], tags: ['ژن', 'جهش', 'بیماری'], featured: false },
      { id: 'data-science-bio', title: 'علم داده در علوم زیستی', instructor: 'دکتر محمد کاظمی', instructorId: 'prof-4', price: 3200000, originalPrice: 4000000, level: 'پیشرفته', duration: '۱۴ هفته', students: 198, rating: 4.6, category: 'علم داده', icon: '📊', image: 'images/datasci.jpg', description: 'Python و R برای تحلیل داده‌های بیولوژیکی و یادگیری ماشین.', chapters: [{ title: 'Python', lessons: 5 }, { title: 'R', lessons: 4 }, { title: 'ML', lessons: 5 }], tags: ['Python', 'R', 'ماشین'], featured: true },
      { id: 'cell-biology', title: 'زیست‌شناسی سلولی مدرن', instructor: 'دکتر فاطمه عباسی', instructorId: 'prof-5', price: 1800000, originalPrice: 2500000, level: 'مبتدی', duration: '۸ هفته', students: 412, rating: 4.5, category: 'زیست‌شناسی', icon: '🦠', image: 'images/cell.jpg', description: 'ساختار سلول، ارگانل‌ها و سیگنالینگ سلولی.', chapters: [{ title: 'ساختار', lessons: 3 }, { title: 'ارگانل‌ها', lessons: 4 }], tags: ['سلول', 'میکروسکوپ'], featured: false },
      { id: 'ecology-modeling', title: 'مدل‌سازی اکولوژیکی', instructor: 'دکتر حسن شریفی', instructorId: 'prof-6', price: 2600000, originalPrice: 3300000, level: 'متوسط', duration: '۱۰ هفته', students: 145, rating: 4.7, category: 'اکولوژی', icon: '🌿', image: 'images/ecology.jpg', description: 'مدل‌سازی ریاضی اکوسیستم‌ها و دینامیک جمعیت.', chapters: [{ title: 'مبانی', lessons: 4 }, { title: 'مدل‌ها', lessons: 4 }], tags: ['اکوسیستم', 'مدل'], featured: false },
      { id: 'neuro-computing', title: '神经‌شناسی محاسباتی', instructor: 'دکتر رضا قاسمی', instructorId: 'prof-7', price: 3800000, originalPrice: 4800000, level: 'پیشرفته', duration: '۱۴ هفته', students: 89, rating: 4.9, category: '神经‌شناسی', icon: '🧠', image: 'images/neuro.jpg', description: 'مدل‌سازی شبکه‌های عصبی بیولوژیکی و یادگیری عمیق.', chapters: [{ title: 'نورون', lessons: 4 }, { title: 'شبکه', lessons: 5 }], tags: ['شبکه عصبی', 'عمیق'], featured: true },
      { id: 'pharma-bioinfo', title: 'بیوانفارماتیک دارویی', instructor: 'دکتر نگار محمدی', instructorId: 'prof-8', price: 2900000, originalPrice: 3700000, level: 'متوسط', duration: '۱۰ هفته', students: 167, rating: 4.6, category: 'داروسازی', icon: '💊', image: 'images/pharma.jpg', description: 'طراحی دارو با رویکرد بیوانفورماتیک و شیمی محاسباتی.', chapters: [{ title: 'مبانی', lessons: 3 }, { title: 'طراحی', lessons: 5 }], tags: ['دارو', 'مولکول'], featured: false },
      { id: 'stat-bio', title: 'آمار زیستی با R', instructor: 'دکتر امیر حسینی', instructorId: 'prof-9', price: 1500000, originalPrice: 2000000, level: 'مبتدی', duration: '۶ هفته', students: 523, rating: 4.4, category: 'آمار', icon: '📈', image: 'images/stat.jpg', description: 'آمار و احتمال کاربردی در علوم زیستی با نرم‌افزار R.', chapters: [{ title: 'مبانی آمار', lessons: 4 }, { title: 'تحلیل', lessons: 4 }], tags: ['آمار', 'R'], featured: false },
      { id: 'python-bio', title: 'پایتون برای زیست‌شناسان', instructor: 'دکتر سارا احمدی', instructorId: 'prof-1', price: 1200000, originalPrice: 1800000, level: 'مبتدی', duration: '۸ هفته', students: 687, rating: 4.7, category: 'برنامه‌نویسی', icon: '🐍', image: 'images/python.jpg', description: 'آموزش پایتون از صفر مخصوص علوم زیستی و آزمایشگاهی.', chapters: [{ title: 'مبانی پایتون', lessons: 5 }, { title: 'کتابخانه‌ها', lessons: 5 }], tags: ['پایتون', 'کدنویسی'], featured: true },
      { id: 'microbiology', title: 'میکروبیولوژی مولکولی', instructor: 'دکتر زهرا کریمی', instructorId: 'prof-10', price: 2200000, originalPrice: 2800000, level: 'متوسط', duration: '۱۰ هفته', students: 234, rating: 4.5, category: 'میکروبیولوژی', icon: '🧫', image: 'images/micro.jpg', description: 'میکروب‌شناسی مولکولی، ژنومیکس میکروبی و مقاومت آنتی‌بیوتیکی.', chapters: [{ title: 'میکروب‌ها', lessons: 4 }, { title: 'ژنومیکس', lessons: 4 }], tags: ['میکروب', 'باکتری'], featured: false },
      { id: 'image-analysis', title: 'پردازش تصاویر میکروسکوپی', instructor: 'دکتر بهرام راد', instructorId: 'prof-11', price: 2700000, originalPrice: 3400000, level: 'پیشرفته', duration: '۱۲ هفته', students: 112, rating: 4.8, category: 'پردازش تصویر', icon: '🖼', image: 'images/image.jpg', description: 'تحلیل و پردازش تصاویر میکروسکوپی با هوش مصنوعی.', chapters: [{ title: 'مبانی', lessons: 4 }, { title: 'AI', lessons: 5 }], tags: ['تصویر', 'AI'], featured: false }
    ];
  }

  function getDefaultProfessors() {
    return [
      { id: 'prof-1', name: 'دکتر سارا احمدی', title: 'دانشیار بیوانفورماتیک', university: 'دانشگاه تهران', specialty: 'بیوانفورماتیک و زیست‌شناسی محاسباتی', courses: 2, students: 1029, rating: 4.8, publications: 34, hIndex: 12, email: 's.ahmadif@ut.ac.ir', bio: 'متخصص بیوانفارماتیک با بیش از ۱۵ سال تجربه آموزش و پژوهش.', avatar: '' },
      { id: 'prof-2', name: 'دکتر علی رضایی', title: 'استاد تمام ژنومیکس', university: 'دانشگاه شیراز', specialty: 'ژنومیکس مقایسه‌ای و پروتئومیکس', courses: 1, students: 187, rating: 4.9, publications: 58, hIndex: 18, email: 'a.rezaei@shirazu.ac.ir', bio: 'پژوهشگر برتر ژنومیکس با تمرکز بر تحلیل داده‌های بزرگ بیولوژیکی.', avatar: '' },
      { id: 'prof-3', name: 'دکتر مریم نوری', title: 'دانشیار ژنتیک پزشکی', university: 'دانشگاه علوم پزشکی تهران', specialty: 'ژنتیک مولکولی و ژن‌درمانی', courses: 1, students: 256, rating: 4.7, publications: 42, hIndex: 15, email: 'm.nouri@tums.ac.ir', bio: 'متخصص ژنتیک پزشکی با تمرکز بر بیماری‌های نادر ژنتیکی.', avatar: '' },
      { id: 'prof-4', name: 'دکتر محمد کاظمی', title: 'استادیار علم داده', university: 'دانشگاه صنعتی شریف', specialty: 'یادگیری ماشین در علوم زیستی', courses: 1, students: 198, rating: 4.6, publications: 28, hIndex: 10, email: 'm.kazemi@sharif.edu', bio: 'ترکیب علم داده و زیست‌شناسی برای کشف الگوهای نهفته در داده‌های بیولوژیکی.', avatar: '' },
      { id: 'prof-5', name: 'دکتر فاطمه عباسی', title: 'استاد زیست‌شناسی سلولی', university: 'دانشگاه تربیت مدرس', specialty: 'بیولوژی سلولی و مولکولی', courses: 1, students: 412, rating: 4.5, publications: 51, hIndex: 16, email: 'f.abbasi@modares.ac.ir', bio: 'بیش از ۲۰ سال تجربه آموزش زیست‌شناسی سلولی و مولکولی.', avatar: '' },
      { id: 'prof-6', name: 'دکتر حسن شریفی', title: 'دانشیار اکولوژی', university: 'دانشگاه اصفهان', specialty: 'مدل‌سازی اکولوژیکی و تنوع زیستی', courses: 1, students: 145, rating: 4.7, publications: 39, hIndex: 13, email: 'h.sharif@ui.ac.ir', bio: 'متخصص مدل‌سازی اکوسیستم‌ها و حفاظت از تنوع زیستی.', avatar: '' }
    ];
  }

  function getDefaultForumPosts() {
    return [
      { id: 'fp_1', title: 'بهترین کتاب بیوانفارماتیک برای مبتدی‌ها؟', content: 'سلام. می‌خوام بیوانفارماتیک رو شروع کنم. بهترین کتاب یا منبع چیه؟', category: 'بیوانفارماتیک', author: 'علی محمدی', authorRole: 'student', replies: [{ author: 'دکتر سارا احمدی', text: 'کتاب Biological Sequence Analysis رو پیشنهاد می‌کنم.', date: '۱۴۰۵/۰۲/۱۵' }], likes: 24, views: 156, createdAt: '2026-05-01T10:00:00Z' },
      { id: 'fp_2', title: 'مشکل در نصب Biopython روی ویندوز', content: 'هنگام نصب Biopython ارور می‌گیرم. کسی می‌تونه کمک کنه؟', category: 'برنامه‌نویسی', author: 'زهرا کریمی', authorRole: 'student', replies: [], likes: 8, views: 89, createdAt: '2026-05-03T14:00:00Z' },
      { id: 'fp_3', title: 'فرصت شغلی: پژوهشگر بیوانفارماتیک', content: 'آزمایشگاه ما به یک پژوهشگر بیوانفارماتیک نیاز دارد. مسلط به Python و R.', category: 'فرصت شغلی', author: 'دکتر علی رضایی', authorRole: 'professor', replies: [{ author: 'نیلوفر رضایی', text: 'سلام. شرایط احراز هویت چیه؟', date: '۱۴۰۵/۰۳/۰۱' }], likes: 45, views: 312, createdAt: '2026-04-28T09:00:00Z' },
      { id: 'fp_4', title: 'مقایسه BLAST و FASTA', content: 'تفاوت اصلی BLAST و FASTA چیه و کی از کدوم استفاده کنیم؟', category: 'بیوانفارماتیک', author: 'محمد حسینی', authorRole: 'student', replies: [], likes: 19, views: 134, createdAt: '2026-05-05T11:00:00Z' },
      { id: 'fp_5', title: 'سمینار آنلاین: CRISPR و آینده ژن‌درمانی', content: 'هفته آینده سمینار آنلاینی درباره CRISPR برگزار می‌شه. همه دعوتن!', category: 'رویداد', author: 'دکتر مریم نوری', authorRole: 'professor', replies: [], likes: 67, views: 445, createdAt: '2026-05-02T16:00:00Z' }
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