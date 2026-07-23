<?php
// ═══════════════════════════════════════════════════════════
// آئورا — اسکریپت نصب و مقداردهی اولیه
// بعد از اجرا این فایل را حذف کنید!
// ═══════════════════════════════════════════════════════════

// خواندن تنظیمات (باید قبل از هر echo بارگذاری شود، چون داخلش header() صدا زده می‌شود)
require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

echo '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>نصب آئورا</title>
<style>body{font-family:Vazirmatn,Tahoma,sans-serif;max-width:700px;margin:40px auto;padding:20px;background:#1a1a2e;color:#e0e0e0}
h1{color:#e0c54f} .ok{color:#4caf50} .err{color:#e74c3c} .warn{color:#ff9800}
pre{background:#16213e;padding:15px;border-radius:8px;overflow-x:auto;direction:ltr;text-align:left}
code{color:#e0c54f}</style></head><body>';

echo '<h1>🔧 نصب آئورا</h1>';

echo '<h2>۱. اتصال دیتابیس</h2>';
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";charset=utf8mb4",
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo '<p class="ok">✅ اتصال به MySQL موفق</p>';
} catch (PDOException $e) {
    echo '<p class="err">❌ خطا در اتصال: ' . htmlspecialchars($e->getMessage()) . '</p>';
    echo '<p>فایل <code>api/config.php</code> را بررسی کنید.</p>';
    echo '</body></html>';
    exit;
}

// ساخت دیتابیس
echo '<h2>۲. ساخت دیتابیس</h2>';
$pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$pdo->exec("USE `" . DB_NAME . "`");
echo '<p class="ok">✅ دیتابیس <code>' . DB_NAME . '</code> آماده است</p>';

// اجرای اسکیما
echo '<h2>۳. ساخت جداول</h2>';
$sql = file_get_contents(__DIR__ . '/db.sql');
// حذف خط INSERT ادمین (با هش نمونه)
$sql = preg_replace('/INSERT IGNORE INTO `users`.+?;/s', '', $sql);
$sql = preg_replace('/INSERT IGNORE INTO `site_settings`.+?;/s', '', $sql);

$statements = array_filter(array_map('trim', explode(';', $sql)));
$count = 0;
foreach ($statements as $stmt) {
    if (empty($stmt) || strpos($stmt, '--') === 0) continue;
    try {
        $pdo->exec($stmt);
        $count++;
    } catch (PDOException $e) {
        // نادیده گرفتن خطاهای "already exists"
        if (strpos($e->getMessage(), 'already exists') === false) {
            echo '<p class="warn">⚠️ ' . htmlspecialchars($e->getMessage()) . '</p>';
        }
    }
}
echo '<p class="ok">✅ تعداد ' . $count . ' جدول ساخته شد</p>';

// مقداردهی ادمین
echo '<h2>۴. ایجاد کاربر ادمین</h2>';
$adminEmail = 'aora@admin.ir';
$adminPass = 'admin123';
$hash = password_hash($adminPass, PASSWORD_BCRYPT);

$stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, role, is_active, created_at) 
    VALUES (?, ?, ?, 'admin', 1, NOW()) 
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)");
$stmt->execute(['مدیر آئورا', $adminEmail, $hash]);
echo '<p class="ok">✅ ادمین ایجاد شد</p>';
echo '<p>ایمیل: <code>' . $adminEmail . '</code></p>';
echo '<p>رمز: <code>' . $adminPass . '</code></p>';
echo '<p class="warn">⚠️ حتماً رمز ادمین را بعد از اولین ورود تغییر دهید!</p>';

// تنظیمات سایت
$stmt = $pdo->prepare("INSERT INTO site_settings (id, site_name, updated_at) VALUES (1, 'آئورا', NOW()) ON DUPLICATE KEY UPDATE site_name = VALUES(site_name)");
$stmt->execute();
echo '<p class="ok">✅ تنظیمات پیش‌فرض ذخیره شد</p>';

echo '<h2>🎉 نصب کامل شد!</h2>';
echo '<p>حالا:</p>';
echo '<ol>';
echo '<li>این فایل (<code>api/setup.php</code>) را <strong>حذف کنید</strong></li>';
echo '<li>به <a href="/" style="color:#e0c54f">صفحه اصلی سایت</a> بروید</li>';
echo '<li>از <a href="/login" style="color:#e0c54f">صفحه ورود</a> با اطلاعات ادمین وارد شوید</li>';
echo '</ol>';

echo '</body></html>';
