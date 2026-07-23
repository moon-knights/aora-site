<?php
// ═══════════════════════════════════════════════════════════
// آئورا — بازنشانی رمز ادمین (فقط رمز؛ به داده‌های دیگر کاری ندارد)
// بعد از استفاده این فایل را حذف کنید!
// ═══════════════════════════════════════════════════════════

require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

echo '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>بازنشانی ادمین</title>
<style>body{font-family:Vazirmatn,Tahoma,sans-serif;max-width:700px;margin:40px auto;padding:20px;background:#1a1a2e;color:#e0e0e0}
h1{color:#e0c54f} .ok{color:#4caf50} .err{color:#e74c3c} .warn{color:#ff9800}
code{color:#e0c54f}</style></head><body>';

echo '<h1>🔑 بازنشانی رمز ادمین</h1>';

$adminEmail = 'aora@admin.ir';
$newPass = 'admin123';

try {
    $pdo = getDB();
    $hash = password_hash($newPass, PASSWORD_BCRYPT);

    // اگر ادمین با این ایمیل وجود دارد، رمزش را بروزرسانی کن؛ در غیر این صورت بسازش.
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$adminEmail]);
    $existing = $stmt->fetch();

    if ($existing) {
        $stmt = $pdo->prepare('UPDATE users SET password_hash = ?, role = ?, is_active = 1 WHERE email = ?');
        $stmt->execute([$hash, 'admin', $adminEmail]);
        echo '<p class="ok">✅ رمز کاربر ادمین موجود بازنشانی شد.</p>';
    } else {
        $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, 'admin', 1, NOW())");
        $stmt->execute(['مدیر آئورا', $adminEmail, $hash]);
        echo '<p class="ok">✅ کاربر ادمین ساخته شد (وجود نداشت).</p>';
    }

    // تأیید فوری با password_verify، تا مطمئن شویم هش درست کار می‌کند
    $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE email = ?');
    $stmt->execute([$adminEmail]);
    $row = $stmt->fetch();
    if ($row && password_verify($newPass, $row['password_hash'])) {
        echo '<p class="ok">✅ تایید شد: رمز جدید صحیح ذخیره شده است.</p>';
    } else {
        echo '<p class="err">❌ چیزی درست نشد؛ لطفاً دستی بررسی کنید.</p>';
    }

    echo '<p>حالا با این اطلاعات وارد شوید:</p>';
    echo '<p>ایمیل: <code>' . htmlspecialchars($adminEmail) . '</code></p>';
    echo '<p>رمز: <code>' . htmlspecialchars($newPass) . '</code></p>';
    echo '<p class="warn">⚠️ بعد از ورود موفق، حتماً رمز را از پنل تغییر دهید و این فایل (<code>api/reset-admin.php</code>) را حذف کنید.</p>';

} catch (Exception $e) {
    echo '<p class="err">❌ خطا: ' . htmlspecialchars($e->getMessage()) . '</p>';
}

echo '</body></html>';
