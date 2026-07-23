<?php
// ═══════════════════════════════════════════════════════════
// آئورا — تست اتصال و API
// بعد از تست حذف کنید!
// ═══════════════════════════════════════════════════════════

header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تست آئورا</title>
<style>body{font-family:Vazirmatn,Tahoma,sans-serif;max-width:700px;margin:40px auto;padding:20px;background:#1a1a2e;color:#e0e0e0}
h1{color:#e0c54f} .ok{color:#4caf50} .err{color:#e74c3c} .warn{color:#ff9800}
pre{background:#16213e;padding:15px;border-radius:8px;overflow-x:auto;direction:ltr;text-align:left}
code{color:#e0c54f} button{padding:8px 16px;margin:5px;cursor:pointer;border:none;border-radius:6px;font-family:inherit}
.btn{background:#e0c547;color:#1a1a2e;font-weight:600}</style></head><body>';

echo '<h1>🔧 تست آئورا</h1>';

// تست ۱: اتصال دیتابیس
echo '<h2>۱. تست اتصال دیتابیس</h2>';
require_once __DIR__ . '/config.php';
try {
    $db = getDB();
    echo '<p class="ok">✅ اتصال به MySQL موفق</p>';
} catch (Exception $e) {
    echo '<p class="err">❌ خطا: ' . htmlspecialchars($e->getMessage()) . '</p>';
    echo '</body></html>';
    exit;
}

// تست ۲: وجود جدول users
echo '<h2>۲. تست جداول</h2>';
$tables = ['users', 'courses', 'enrollments', 'forum_posts', 'meetings', 'surveys', 'payment_transactions', 'pages', 'site_settings'];
foreach ($tables as $t) {
    $stmt = $db->query("SHOW TABLES LIKE '$t'");
    if ($stmt->fetch()) {
        $count = $db->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
        echo "<p class='ok'>✅ جدول `$t` — $count ردیف</p>";
    } else {
        echo "<p class='err'>❌ جدول `$t` وجود ندارد! <a href='setup.php' style='color:#e0c54f'>نصب کنید</a></p>";
    }
}

// تست ۳: کاربر ادمین
echo '<h2>۳. تست کاربر ادمین</h2>';
$stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute(['aora@admin.ir']);
$admin = $stmt->fetch();
if ($admin) {
    echo '<p class="ok">✅ ادمین یافت شد: ' . htmlspecialchars($admin['full_name']) . ' (' . $admin['role'] . ')</p>';
    
    // تست رمز
    if (password_verify('admin123', $admin['password_hash'])) {
        echo '<p class="ok">✅ رمز عبور صحیح است</p>';
    } else {
        echo '<p class="err">❌ رمز عبور اشتباه است! هش: ' . substr($admin['password_hash'], 0, 20) . '...</p>';
        echo '<p class="warn">⚠️ <a href="setup.php" style="color:#e0c54f">setup.php</a> را دوباره اجرا کنید</p>';
    }
} else {
    echo '<p class="err">❌ ادمین با ایمیل aora@admin.ir یافت نشد!</p>';
    echo '<p class="warn">⚠️ <a href="setup.php" style="color:#e0c54f">setup.php</a> را اجرا کنید</p>';
}

// تست ۴: تست ورود API
echo '<h2>۴. تست ورود API</h2>';
echo '<p>دکمه زیر را بزنید تا ورود API تست شود:</p>';
echo '<button class="btn" onclick="testLogin()">🔐 تست ورود</button>';
echo '<pre id="loginResult" style="min-height:60px">در انتظار تست...</pre>';

// تست ۵: تست مسیریابی
echo '<h2>۵. تست مسیریابی</h2>';
echo '<p>بررسی اینکه آیا درخواست‌ها به درستی مسیریابی می‌شوند:</p>';
echo '<button class="btn" onclick="testRoute()">🔀 تست مسیریابی</button>';
echo '<pre id="routeResult" style="min-height:60px">در انتظار تست...</pre>';

echo '<h2>۶. اطلاعات سرور</h2>';
echo '<p>PHP: <code>' . phpversion() . '</code></p>';
echo '<p>Server: <code>' . ($_SERVER['SERVER_SOFTWARE'] ?? 'نامشخص') . '</code></p>';
echo '<p>mod_rewrite: <code>' . (function_exists('apache_get_modules') && in_array('mod_rewrite', apache_get_modules()) ? 'فعال ✅' : 'نامشخص (ممکن است فعال باشد)') . '</code></p>';
echo '<p>DOCUMENT_ROOT: <code>' . ($_SERVER['DOCUMENT_ROOT'] ?? 'نامشخص') . '</code></p>';
echo '<p>REQUEST_URI: <code>' . ($_SERVER['REQUEST_URI'] ?? 'نامشخص') . '</code></p>';

echo '<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script>
function testLogin() {
    var el = document.getElementById("loginResult");
    el.textContent = "در حال تست...";
    $.ajax({
        url: "api/auth/login",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ email: "aora@admin.ir", password: "admin123" }),
        dataType: "json"
    }).done(function(res) {
        el.textContent = "✅ موفق!\n" + JSON.stringify(res, null, 2);
        el.style.color = "#4caf50";
    }).fail(function(xhr) {
        // fallback با query parameter
        $.ajax({
            url: "api/index.php?route=auth/login",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ email: "aora@admin.ir", password: "admin123" }),
            dataType: "json"
        }).done(function(res) {
            el.textContent = "✅ موفق (با fallback)!\n" + JSON.stringify(res, null, 2);
            el.style.color = "#ff9800";
        }).fail(function(xhr2) {
            el.textContent = "❌ خطا!\nStatus: " + xhr.status + " / " + xhr2.status + "\nResponse: " + (xhr.responseText || "خالی");
            el.style.color = "#e74c3c";
        });
    });
}

function testRoute() {
    var el = document.getElementById("routeResult");
    el.textContent = "در حال تست...";
    $.ajax({
        url: "api/settings",
        method: "GET",
        dataType: "json"
    }).done(function(res) {
        el.textContent = "✅ مسیریابی کار می‌کند!\nResponse: " + JSON.stringify(res, null, 2).substring(0, 300);
        el.style.color = "#4caf50";
    }).fail(function(xhr) {
        $.ajax({
            url: "api/index.php?route=settings",
            method: "GET",
            dataType: "json"
        }).done(function(res) {
            el.textContent = "⚠️ مسیریابی با rewrite کار نمی‌کند ولی fallback کار می‌کند!\nResponse: " + JSON.stringify(res, null, 2).substring(0, 300);
            el.style.color = "#ff9800";
        }).fail(function(xhr2) {
            el.textContent = "❌ مسیریابی کار نمی‌کند!\nStatus: " + xhr.status + " / " + xhr2.status;
            el.style.color = "#e74c3c";
        });
    });
}
</script>';

echo '</body></html>';
