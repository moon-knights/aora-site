<?php
// آئورا — API تنظیمات
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET: دریافت تنظیمات ──
if ($method === 'GET') {
    $stmt = $db->query('SELECT * FROM site_settings WHERE id = 1');
    $settings = $stmt->fetch();
    if (!$settings) {
        $db->exec('INSERT IGNORE INTO site_settings (id, site_name, updated_at) VALUES (1, "آئورا", NOW())');
        $settings = $db->query('SELECT * FROM site_settings WHERE id = 1')->fetch();
    }
    jsonResponse($settings);
}

// ── PUT: بروزرسانی تنظیمات ──
if ($method === 'PUT') {
    $auth = requireRole('admin');
    $data = getJsonInput();

    $fields = [];
    $params = [];
    if (isset($data['siteName'])) { $fields[] = 'site_name = ?'; $params[] = $data['siteName']; }
    if (isset($data['supportEmail'])) { $fields[] = 'support_email = ?'; $params[] = $data['supportEmail']; }
    if (isset($data['customCss'])) { $fields[] = 'custom_css = ?'; $params[] = $data['customCss']; }
    if (isset($data['customHeadScripts'])) { $fields[] = 'custom_head_scripts = ?'; $params[] = $data['customHeadScripts']; }
    $fields[] = 'updated_at = NOW()';

    if (!empty($params)) {
        $sql = 'UPDATE site_settings SET ' . implode(', ', $fields) . ' WHERE id = 1';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }
    jsonResponse(['message' => 'تنظیمات ذخیره شد.']);
}

jsonError('Method not allowed', 405);
