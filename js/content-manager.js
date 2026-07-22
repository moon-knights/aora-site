/* ═══════════════════════════════════════════════════════════════════
   آئورا — مدیریت محتوای صفحات
   ذخیره و بازیابی محتوای قابل ویرایش صفحات
   ═══════════════════════════════════════════════════════════════════ */

var ContentManager = (function () {

  var STORAGE_KEY = 'aoura_page_content';

  /* ═══════════════════════════════════════
     تعریف بخش‌های قابل ویرایش هر صفحه
     ═══════════════════════════════════════ */
  var pageDefinitions = {

    '/': {
      title: 'صفحه اصلی',
      icon: '🏠',
      sections: [
        { key: 'hero_title',       label: 'عنوان اصلی',         type: 'text',     default: 'ایده‌هات رو به واقعیت تبدیل کن' },
        { key: 'hero_subtitle',    label: 'زیرعنوان',            type: 'textarea', default: 'از تولید فیلم و مستند گرفته تا آموزش تخصصی و اجرای پروژه‌های حرفه‌ای — آئورا کنارته' },
        { key: 'hero_btn_text',    label: 'متن دکمه اصلی',      type: 'text',     default: 'شروع همکاری' },
        { key: 'hero_btn_link',    label: 'لینک دکمه اصلی',     type: 'text',     default: '/register' },
        { key: 'hero_btn2_text',   label: 'متن دکمه دوم',       type: 'text',     default: 'نمونه‌کارها' },
        { key: 'hero_btn2_link',   label: 'لینک دکمه دوم',      type: 'text',     default: '/research' },
        { key: 'stats_1_num',      label: 'آمار ۱ — عدد',       type: 'text',     default: '+۵۰' },
        { key: 'stats_1_label',    label: 'آمار ۱ — عنوان',     type: 'text',     default: 'پروژه موفق' },
        { key: 'stats_2_num',      label: 'آمار ۲ — عدد',       type: 'text',     default: '+۲۰' },
        { key: 'stats_2_label',    label: 'آمار ۲ — عنوان',     type: 'text',     default: 'فیلم و مستند' },
        { key: 'stats_3_num',      label: 'آمار ۳ — عدد',       type: 'text',     default: '+۱۵' },
        { key: 'stats_3_label',    label: 'آمار ۳ — عنوان',     type: 'text',     default: 'عضو تیم' },
        { key: 'stats_4_num',      label: 'آمار ۴ — عدد',       type: 'text',     default: '+۳۰' },
        { key: 'stats_4_label',    label: 'آمار ۴ — عنوان',     type: 'text',     default: 'دوره آموزشی' },
        { key: 'section_title',    label: 'عنوان بخش خدمات',    type: 'text',     default: 'خدمات آئورا' },
        { key: 'cta_title',        label: 'فراخوان — عنوان',    type: 'text',     default: 'پروژه‌ات رو شروع کن' },
        { key: 'cta_subtitle',     label: 'فراخوان — زیرعنوان', type: 'text',     default: 'فرقی نمی‌کنه یه فیلم کوتاه باشه یه کمپین تبلیغاتی یا یه دوره آموزشی — ما آماده‌ایم' },
        { key: 'cta_btn',          label: 'فراخوان — دکمه',     type: 'text',     default: 'ثبت‌نام رایگان' }
      ]
    },

    '/courses': {
      title: 'خدمات و دوره‌ها',
      icon: '📚',
      sections: [
        { key: 'page_title',       label: 'عنوان صفحه',         type: 'text',     default: 'خدمات و دوره‌های آئورا' },
        { key: 'page_subtitle',    label: 'زیرعنوان',            type: 'textarea', default: 'دوره‌های تخصصی آئورا را کشف کنید' },
        { key: 'empty_msg',        label: 'پیام خالی بودن',      type: 'text',     default: 'هنوز دوره‌ای ثبت نشده است' },
        { key: 'search_placeholder', label: 'متن جستجو',         type: 'text',     default: 'جستجوی دوره...' }
      ]
    },

    '/professors': {
      title: 'اساتید',
      icon: '👨‍🏫',
      sections: [
        { key: 'page_title',       label: 'عنوان صفحه',         type: 'text',     default: 'اساتید آئورا' },
        { key: 'page_subtitle',    label: 'زیرعنوان',            type: 'textarea', default: 'با بهترین اساتید و متخصصان آئورا آشنا شوید' },
        { key: 'empty_msg',        label: 'پیام خالی بودن',      type: 'text',     default: 'هنوز استادی ثبت نشده' }
      ]
    },

    '/students': {
      title: 'کارآموزان',
      icon: '🎓',
      sections: [
        { key: 'page_title',       label: 'عنوان صفحه',         type: 'text',     default: 'کارآموزان آئورا' },
        { key: 'page_subtitle',    label: 'زیرعنوان',            type: 'textarea', default: 'جامعه کارآموزان آئورا' },
        { key: 'empty_msg',        label: 'پیام خالی بودن',      type: 'text',     default: 'هنوز کارآموزی ثبت نشده' }
      ]
    },

    '/forum': {
      title: 'تالار گفتگو',
      icon: '💬',
      sections: [
        { key: 'page_title',       label: 'عنوان صفحه',         type: 'text',     default: 'تالار گفتگو' },
        { key: 'page_subtitle',    label: 'زیرعنوان',            type: 'textarea', default: 'پرسش‌ها و پاسخ‌های تخصصی' },
        { key: 'new_post_btn',     label: 'دکمه پست جدید',       type: 'text',     default: 'پست جدید' },
        { key: 'empty_msg',        label: 'پیام خالی بودن',      type: 'text',     default: 'هنوز پستی ثبت نشده' }
      ]
    },

    '/resources': {
      title: 'منابع',
      icon: '📚',
      sections: [
        { key: 'page_title',       label: 'عنوان صفحه',         type: 'text',     default: 'منابع آموزشی' },
        { key: 'page_subtitle',    label: 'زیرعنوان',            type: 'textarea', default: 'کتاب‌ها، مقالات و ابزارهای آموزشی' },
        { key: 'empty_msg',        label: 'پیام خالی بودن',      type: 'text',     default: 'هنوز منبعی ثبت نشده' }
      ]
    },

    '/research': {
      title: 'پژوهش',
      icon: '🔬',
      sections: [
        { key: 'page_title',       label: 'عنوان صفحه',         type: 'text',     default: 'پژوهش‌ها' },
        { key: 'page_subtitle',    label: 'زیرعنوان',            type: 'textarea', default: 'آخرین پژوهش‌ها و مقالات علمی' },
        { key: 'empty_msg',        label: 'پیام خالی بودن',      type: 'text',     default: 'هنوز پژوهشی ثبت نشده' }
      ]
    },

    '/about': {
      title: 'درباره ما',
      icon: 'ℹ️',
      sections: [
        { key: 'hero_title',       label: 'عنوان اصلی',         type: 'text',     default: 'درباره آئورا' },
        { key: 'hero_subtitle',    label: 'زیرعنوان',            type: 'textarea', default: 'داستان ما و ماموریتمان' },
        { key: 'mission_title',    label: 'ماموریت — عنوان',     type: 'text',     default: '🎯 ماموریت ما' },
        { key: 'mission_text',     label: 'ماموریت — متن',       type: 'textarea', default: 'ارائه خدمات تولید فیلم و مستند، آموزش‌های تخصصی و اجرای پروژه‌های حرفه‌ای با بهترین کیفیت و دسترسی آسان برای همه علاقه‌مندان.' },
        { key: 'vision_title',     label: 'چشم‌انداز — عنوان',   type: 'text',     default: '🔭 چشم‌انداز' },
        { key: 'vision_text',      label: 'چشم‌انداز — متن',     type: 'textarea', default: 'تبدیل شدن به یک استودیوی پیشرو در تولید محتوا، آموزش و پژوهش در خاورمیانه و ایجاد جامعه‌ای پویا از متخصصان و خلاقان.' },
        { key: 'about_text',       label: 'متن معرفی',           type: 'textarea', default: 'آئورا با هدف تولید محتوای حرفه‌ای، آموزش تخصصی و اجرای پروژه‌های خلاق در ایران تاسیس شد. ما معتقدیم هر کسی حق دسترسی به خدمات باکیفیت را دارد.' }
      ]
    }
  };


  /* ═══════════════════════════════════════
     دریافت محتوای ذخیره‌شده
     ═══════════════════════════════════════ */
  function getAllContent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  function getPageContent(pageFile) {
    var all = getAllContent();
    return all[pageFile] || {};
  }

  function getValue(pageFile, key) {
    var pageContent = getPageContent(pageFile);
    if (pageContent[key] !== undefined && pageContent[key] !== '') {
      return pageContent[key];
    }
    // برگردوندن مقدار پیش‌فرض
    var def = pageDefinitions[pageFile];
    if (def) {
      var section = def.sections.find(function (s) { return s.key === key; });
      if (section) return section.default;
    }
    return '';
  }


  /* ═══════════════════════════════════════
     ذخیره محتوا
     ═══════════════════════════════════════ */
  function savePageContent(pageFile, data) {
    var all = getAllContent();
    all[pageFile] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function saveValue(pageFile, key, value) {
    var all = getAllContent();
    if (!all[pageFile]) all[pageFile] = {};
    all[pageFile][key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }


  /* ═══════════════════════════════════════
     بازنشانی به پیش‌فرض
     ═══════════════════════════════════════ */
  function resetPage(pageFile) {
    var all = getAllContent();
    delete all[pageFile];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
  }


  /* ═══════════════════════════════════════
     اعمال محتوا در صفحه
     فراخوانی از هر صفحه HTML
     ═══════════════════════════════════════ */
    function applyToPage(pageFile) {
    var pageContent = getPageContent(pageFile);
    var def = pageDefinitions[pageFile];
    if (!def) return;

    def.sections.forEach(function (section) {
      var value = pageContent[section.key];
      if (value === undefined || value === '') value = section.default;

      // محتوای متنی
      var $el = $('[data-cm-key="' + section.key + '"]');
      if ($el.length) {
        if ($el.is('input')) $el.val(value);
        else if ($el.is('textarea')) $el.val(value);
        else $el.html(value.replace(/\n/g, '<br>'));
      }

      // لینک‌ها (href)
      var $hrefEl = $('[data-cm-href="' + section.key + '"]');
      if ($hrefEl.length && value) {
        $hrefEl.attr('href', value);
      }
    });
  }


  /* ═══════════════════════════════════════
     API عمومی
     ═══════════════════════════════════════ */
  return {
    pageDefinitions:  pageDefinitions,
    getAllContent:     getAllContent,
    getPageContent:   getPageContent,
    getValue:         getValue,
    savePageContent:  savePageContent,
    saveValue:        saveValue,
    resetPage:        resetPage,
    resetAll:         resetAll,
    applyToPage:      applyToPage
  };

})();

window.ContentManager = ContentManager;