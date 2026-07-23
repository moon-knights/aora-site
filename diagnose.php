<?php
// ═══════════════════════════════════════════
// فایل دیاگنوستیک آئورا
// این فایل را در کنار index.html آپلود کنید
// و در مرورگر باز کنید: yourdomain.com/diagnose.php
// بعد از عیب‌یابی حذف کنید!
// ═══════════════════════════════════════════
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>عیب‌یابی آئورا</title>
<style>
body{font-family:Vazirmatn,Tahoma,sans-serif;max-width:800px;margin:40px auto;padding:20px;background:#1a1a2e;color:#e0e0e0;line-height:1.8}
h1{color:#e0c54f} h2{color:#7c83ff;margin-top:2rem}
.ok{color:#4caf50} .err{color:#e74c3c} .warn{color:#ff9800}
pre{background:#16213e;padding:15px;border-radius:8px;overflow-x:auto;direction:ltr;text-align:left;font-size:13px}
code{color:#e0c54f;background:#16213e;padding:2px 6px;border-radius:4px}
.test{padding:10px;margin:8px 0;border-radius:8px;background:#16213e;border-right:4px solid #333}
.test.pass{border-right-color:#4caf50} .test.fail{border-right-color:#e74c3c} .test.warn{border-right-color:#ff9800}
</style></head><body>
<h1>🔧 عیب‌یابی آئورا</h1>
<?php

function test($name, $pass, $detail = '') {
    $cls = $pass ? 'pass' : 'fail';
    $icon = $pass ? '✅' : '❌';
    echo "<div class='test $cls'>$icon <strong>$name</strong>";
    if ($detail) echo "<br><small>$detail</small>";
    echo "</div>";
}

function warn($name, $detail = '') {
    echo "<div class='test warn'>⚠️ <strong>$name</strong>";
    if ($detail) echo "<br><small>$detail</small>";
    echo "</div>";
}

// ── 1. PHP Version ──
test('نسخه PHP', version_compare(PHP_VERSION, '7.4.0', '>='), 'نسخه فعلی: ' . PHP_VERSION);

// ── 2. Required Extensions ──
$exts = ['pdo', 'pdo_mysql', 'json', 'mbstring', 'openssl'];
foreach ($exts as $ext) {
    test("افزونه $ext", extension_loaded($ext));
}

// ── 3. Config file ──
$configFile = __DIR__ . '/api/config.php';
test('فایل config.php', file_exists($configFile), $configFile);

// ── 4. DB Connection ──
if (file_exists($configFile)) {
    require_once $configFile;
    try {
        $pdo = getDB();
        test('اتصال دیتابیس', true, 'متصل به ' . DB_NAME);
    } catch (Exception $e) {
        test('اتصال دیتابیس', false, $e->getMessage());
    }
}

// ── 5. Admin user ──
if (isset($pdo)) {
    $stmt = $pdo->query("SELECT id, email, password_hash, role FROM users WHERE role = 'admin' LIMIT 1");
    $admin = $stmt->fetch();
    if ($admin) {
        $pwOk = password_verify('admin123', $admin['password_hash']);
        test('کاربر ادمین', true, 'ایمیل: ' . $admin['email']);
        test('رمز ادمین (admin123)', $pwOk, $pwOk ? 'هش معتبر' : 'هش نامعتبر! دوباره setup.php را اجرا کنید');
    } else {
        test('کاربر ادمین', false, 'ادمین یافت نشد! setup.php را اجرا کنید');
    }
}

// ── 6. mod_rewrite ──
test('mod_rewrite', function_exists('apache_get_modules') ? in_array('mod_rewrite', apache_get_modules()) : 'نامشخص', 'اگر نامشخص است، احتمالاً فعال است');

// ── 7. .htaccess ──
$htaccess = __DIR__ . '/.htaccess';
test('فایل .htaccess', file_exists($htaccess));
if (file_exists($htaccess)) {
    $content = file_get_contents($htaccess);
    test('RewriteBase در .htaccess', strpos($content, 'RewriteBase') !== false, 'اگر نیست، اضافه کنید: RewriteBase /');
}

// ── 8. Test login API ──
echo "<h2>🧪 تست API ورود</h2>";
if (isset($pdo)) {
    $testUrl = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/api/auth/login';
    echo "<p>آدرس تست: <code>$testUrl</code></p>";
    
    // تست مستقیم با PHP
    echo "<h3>تست مستقیم (بدون HTTP):</h3>";
    try {
        // شبیه‌سازی درخواست
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_SERVER['REQUEST_URI'] = '/api/auth/login';
        $rawInput = json_encode(['email' => 'aora@admin.ir', 'password' => 'admin123']);
        
        // بررسی اینکه آیا فایل auth.php درست کار می‌کنه
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute(['aora@admin.ir']);
        $user = $stmt->fetch();
        
        if ($user && password_verify('admin123', $user['password_hash'])) {
            test('لاگین مستقیم', true, 'کاربر ادمین پیدا شد و رمز درست است');
        } else {
            test('لاگین مستقیم', false, 'رمز عبور اشتباه یا کاربر یافت نشد');
        }
    } catch (Exception $e) {
        test('لاگین مستقیم', false, $e->getMessage());
    }
    
    // تست HTTP
    echo "<h3>تست HTTP:</h3>";
    $ch = curl_init($testUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => 'aora@admin.ir', 'password' => 'admin123']));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    
    echo "<div class='test'><strong>کد HTTP:</strong> $httpCode</div>";
    echo "<div class='test'><strong>Content-Type:</strong> " . ($contentType ?? 'نامشخص') . "</div>";
    echo "<pre>Response: " . htmlspecialchars($response) . "</pre>";
    
    $decoded = json_decode($response, true);
    if ($decoded && isset($decoded['success'])) {
        test('پاسخ JSON معتبر', $decoded['success'], 'ورود API کار می‌کند!');
    } else {
        test('پاسخ JSON معتبر', false, 'سرور جواب JSON برنگرداند!');
        warn('احتمالاً .htaccess کار نمی‌کند', 'RewriteBase / را به .htaccess اضافه کنید');
    }
}

// ── 9. Server Info ──
echo "<h2>📋 اطلاعات سرور</h2>";
echo "<pre>";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'نامشخص') . "\n";
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'نامشخص') . "\n";
echo "Current Dir: " . __DIR__ . "\n";
echo "AllowOverride: " . (function_exists('apache_get_modules') ? 'فعال' : 'نامشخص') . "\n";
echo "</pre>";

echo "<hr><p class='warn'>⚠️ بعد از عیب‌یابی، این فایل را حذف کنید!</p>";
?>
</body></html>
