# 🚀 راهنمای نصب آئورا روی cPanel

## پیش‌نیازها
- هاست cPanel با پشتیبانی از PHP 7.4+ و MySQL 5.7+
- دسترسی به phpMyAdmin یا MySQL

## مراحل نصب

### ۱. آپلود فایل‌ها
تمام فایل‌ها را در پوشه `public_html` (یا ساب‌دامین مورد نظر) آپلود کنید.

### ۲. ساخت دیتابیس در cPanel
1. وارد cPanel شوید
2. بخش **MySQL® Databases** را باز کنید
3. یک دیتابیس جدید بسازید (مثلاً `aora_db`)
4. یک کاربر جدید بسازید و آن را به دیتابیس اضافه کنید
5. دسترسی **ALL PRIVILEGES** بدهید

### ۳. تنظیمات اتصال
فایل `api/config.php` را ویرایش کنید:
```php
define('DB_HOST', 'localhost');        // معمولاً localhost
define('DB_NAME', 'aora_db');          // نام دیتابیس ساخته شده
define('DB_USER', 'your_db_user');     // نام کاربری دیتابیس
define('DB_PASS', 'your_db_password'); // رمز عبور دیتابیس
```

### ۴. اجرای نصب
مرورگر خود را باز کنید و به آدرس زیر بروید:
```
https://yourdomain.com/api/setup.php
```

### ۵. حذف فایل نصب
**بعد از نصب موفق، فایل `api/setup.php` را حذف کنید!**

### ۶. ورود به پنل مدیریت
- آدرس: `https://yourdomain.com/login`
- ایمیل: `aora@admin.ir`
- رمز: `admin123`

⚠️ **حتماً رمز ادمین را تغییر دهید!**

## ساختار فایل‌ها
```
├── api/                  # بک‌اند PHP
│   ├── config.php        # تنظیمات دیتابیس
│   ├── db.sql            # اسکیمای دیتابیس
│   ├── index.php         # روتر اصلی
│   ├── auth.php          # احراز هویت
│   ├── courses.php       # مدیریت دوره‌ها
│   ├── enrollment.php    # ثبت‌نام
│   ├── forum.php         # تالار گفتگو
│   ├── admin.php         # پنل ادمین
│   ├── meetings.php      # جلسات
│   ├── surveys.php       # نظرسنجی‌ها
│   ├── payment.php       # پرداخت
│   ├── settings.php      # تنظیمات سایت
│   ├── pages.php         # مدیریت صفحات
│   ├── professors.php    # لیست اساتید
│   ├── students.php      # لیست دانشجویان
│   └── setup.php         # اسکریپت نصب (بعد از نصب حذف شود)
├── js/                   # جاوااسکریپت
│   ├── ajax.js           # ارتباط با API
│   └── app.js            # منطق اصلی
├── css/                  # استایل‌ها
├── .htaccess             # تنظیمات Apache
└── *.html                # صفحات سایت
```

## عیب‌یابی
- اگر خطای 500 دیدید، لاگ‌های سرور را بررسی کنید
- مطمئن شوید `mod_rewrite` در Apache فعال است
- دسترسی فایل‌ها 644 و پوشه‌ها 755 باشد
