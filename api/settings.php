<?php
// ═══════════════════════════════════════════════════════════
// آئورا — API تنظیمات
// ═══════════════════════════════════════════════════════════

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$segments = array_values(array_filter($segments, function($s) { return $s !== 'api' && $s !== 'settings'; }));
$action = $segments[0] ?? '';

// ── GET: دریافت تنظیمات ──
if ($method === 'GET' && !$action) {
    $stmt = $db->query('SELECT * FROM site_settings WHERE id = 1');
    $settings = $stmt->fetch();
    if (!$settings) {
        $db->exec('INSERT IGNORE INTO site_settings (id, site_name, updated_at) VALUES (1, "آئورا", NOW())');
        $settings = $db->query('SELECT * FROM site_settings WHERE id = 1')->fetch();
    }
    jsonResponse($settings);
}

// ── PUT: بروزرسانی تنظیمات ──
if ($method === 'PUT' && !$action) {
    $auth = requireRole('admin');
    $data = getJsonInput();

    $fields = [];
    $params = [];
    if (isset($data['siteName'])) { $fields[] = 'site_name = ?'; $params[] = $data['siteName']; }
    if (isset($data['supportEmail'])) { $fields[] = 'support_email = ?'; $params[] = $data['supportEmail']; }
    if (isset($data['customCss'])) { $fields[] = 'custom_css = ?'; $params[] = $data['customCss']; }
    if (isset($data['customHeadScripts'])) { $fields[] = 'custom_head_scripts = ?'; $params[] = $data['customHeadScripts']; }
    if (isset($data['maintenanceMode'])) { $fields[] = 'maintenance_mode = ?'; $params[] = $data['maintenanceMode'] ? 1 : 0; }
    if (isset($data['faviconUrl'])) { $fields[] = 'favicon_url = ?'; $params[] = $data['faviconUrl']; }
    $fields[] = 'updated_at = NOW()';

    if (!empty($params)) {
        $sql = 'UPDATE site_settings SET ' . implode(', ', $fields) . ' WHERE id = 1';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }
    jsonResponse(['message' => 'تنظیمات ذخیره شد.']);
}

// ── POST: آپلود لوگو ──
if ($method === 'POST' && $action === 'logo') {
    $auth = requireRole('admin');

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        jsonError('فایلی انتخاب نشده است.');
    }

    $file = $_FILES['file'];
    $allowedExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!in_array($ext, $allowedExtensions)) {
        jsonError('فرمت فایل مجاز نیست. فقط PNG, JPG, SVG, WEBP');
    }

    if ($file['size'] > 2 * 1024 * 1024) {
        jsonError('حجم فایل نباید بیشتر از 2 مگابایت باشد.');
    }

    $uploadsDir = __DIR__ . '/../uploads/logo';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }

    $fileName = 'logo-' . time() . '-' . mt_rand(1000, 9999) . '.' . $ext;
    $filePath = $uploadsDir . '/' . $fileName;

    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        jsonError('خطا در ذخیره فایل.', 500);
    }

    $relativePath = '/uploads/logo/' . $fileName;

    // حذف فایل قبلی
    $stmt = $db->prepare('SELECT logo_path FROM site_settings WHERE id = 1');
    $stmt->execute();
    $old = $stmt->fetch();
    if ($old && !empty($old['logo_path'])) {
        $oldFile = __DIR__ . '/..' . $old['logo_path'];
        if (file_exists($oldFile)) {
            unlink($oldFile);
        }
    }

    $stmt = $db->prepare('UPDATE site_settings SET logo_path = ?, logo_url = ?, updated_at = NOW() WHERE id = 1');
    $stmt->execute([$relativePath, $relativePath]);

    jsonResponse([
        'message' => 'لوگو با موفقیت آپلود شد.',
        'path' => $relativePath,
        'url' => $relativePath
    ]);
}

// ── PUT: ذخیره هدر گلوبال ──
if ($method === 'PUT' && $action === 'header') {
    $auth = requireRole('admin');
    $data = getJsonInput();

    $stmt = $db->prepare('UPDATE site_settings SET global_header_html = ?, global_header_css = ?, global_header_state = ?, updated_at = NOW() WHERE id = 1');
    $stmt->execute([
        $data['htmlContent'] ?? null,
        $data['cssContent'] ?? null,
        $data['grapesJsState'] ?? null
    ]);

    jsonResponse(['message' => 'هدر گلوبال ذخیره شد.']);
}

// ── PUT: ذخیره فوتر گلوبال ──
if ($method === 'PUT' && $action === 'footer') {
    $auth = requireRole('admin');
    $data = getJsonInput();

    $stmt = $db->prepare('UPDATE site_settings SET global_footer_html = ?, global_footer_css = ?, global_footer_state = ?, updated_at = NOW() WHERE id = 1');
    $stmt->execute([
        $data['htmlContent'] ?? null,
        $data['cssContent'] ?? null,
        $data['grapesJsState'] ?? null
    ]);

    jsonResponse(['message' => 'فوتر گلوبال ذخیره شد.']);
}

// ── GET: رندر صفحه با هدر/فوتر گلوبال ──
if ($method === 'GET' && $action === 'render' && isset($segments[1])) {
    $slug = $segments[1];

    $stmt = $db->prepare('SELECT * FROM pages WHERE slug = ? AND is_published = 1');
    $stmt->execute([$slug]);
    $page = $stmt->fetch();
    if (!$page) jsonError('صفحه یافت نشد.', 404);

    $settings = $db->query('SELECT * FROM site_settings WHERE id = 1')->fetch();
    $fullHtml = buildFullPageHtml($page, $settings);

    header('Content-Type: text/html; charset=utf-8');
    echo $fullHtml;
    exit;
}

// ── GET: رندر صفحه اصلی ──
if ($method === 'GET' && $action === 'render-home') {
    $stmt = $db->query('SELECT * FROM pages WHERE is_home_page = 1 AND is_published = 1 LIMIT 1');
    $page = $stmt->fetch();

    if (!$page) {
        $stmt = $db->query('SELECT * FROM pages WHERE is_published = 1 LIMIT 1');
        $page = $stmt->fetch();
    }

    if (!$page) jsonError('صفحه‌ای یافت نشد.', 404);

    $settings = $db->query('SELECT * FROM site_settings WHERE id = 1')->fetch();
    $fullHtml = buildFullPageHtml($page, $settings);

    header('Content-Type: text/html; charset=utf-8');
    echo $fullHtml;
    exit;
}

jsonError('مسیر یافت نشد.', 404);

// ═══════════════════════════════════════════════════════════
// تابع رندر صفحه کامل (معادل PageRenderer.cs)
// ═══════════════════════════════════════════════════════════
function buildFullPageHtml($page, $settings) {
    $logoUrl = $settings['logo_url'] ?? '';
    $siteName = $settings['site_name'] ?? 'آئورا';
    $favicon = $settings['favicon_url'] ?? '/favicon.ico';
    $globalCss = $settings['custom_css'] ?? '';
    $headScripts = $settings['custom_head_scripts'] ?? '';
    $headerHtml = $settings['global_header_html'] ?? '';
    $headerCss = $settings['global_header_css'] ?? '';
    $footerHtml = $settings['global_footer_html'] ?? '';
    $footerCss = $settings['global_footer_css'] ?? '';

    $headerHtml = str_replace(['{{LOGO_URL}}', '{{SITE_NAME}}'], [$logoUrl, $siteName], $headerHtml);

    $pageTitle = htmlspecialchars($page['title'] ?? '');
    $metaDesc = htmlspecialchars($page['meta_description'] ?? '');
    $pageCss = $page['css_content'] ?? '';
    $pageHtml = $page['html_content'] ?? '';

    return <<<HTML
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{$pageTitle} — {$siteName}</title>
    <meta name="description" content="{$metaDesc}">
    <link rel="icon" href="{$favicon}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap" rel="stylesheet">

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Vazirmatn', sans-serif; }
        {$globalCss}
        {$headerCss}
        {$footerCss}
    </style>

    <style>
        {$pageCss}
    </style>

    {$headScripts}
</head>
<body>
    <header id="globalHeader">
        {$headerHtml}
    </header>

    <main id="pageContent">
        {$pageHtml}
    </main>

    <footer id="globalFooter">
        {$footerHtml}
    </footer>
</body>
</html>
HTML;
}
