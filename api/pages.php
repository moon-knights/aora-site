<?php
// آئورا — API صفحات
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$segments = array_values(array_filter($segments, function($s) { return $s !== 'api' && $s !== 'pages'; }));
$action = $segments[0] ?? '';

// ── GET: لیست صفحات ──
if ($method === 'GET' && !$action) {
    $stmt = $db->query('SELECT id, title, slug, is_published, is_home_page, sort_order, created_at, updated_at FROM pages ORDER BY updated_at DESC');
    jsonResponse($stmt->fetchAll());
}

// ── GET: صفحه با slug ──
if ($method === 'GET' && $action === 'slug' && isset($segments[1])) {
    $stmt = $db->prepare('SELECT * FROM pages WHERE slug = ? AND is_published = 1');
    $stmt->execute([$segments[1]]);
    $page = $stmt->fetch();
    if (!$page) jsonError('صفحه یافت نشد.', 404);

    $settings = $db->query('SELECT * FROM site_settings WHERE id = 1')->fetch();
    jsonResponse([
        'title' => $page['title'],
        'slug' => $page['slug'],
        'htmlContent' => $page['html_content'],
        'cssContent' => $page['css_content'],
        'metaDescription' => $page['meta_description'],
        'ogImage' => $page['og_image'],
        'globalHeaderHtml' => $settings['global_header_html'] ?? null,
        'globalHeaderCss' => $settings['global_header_css'] ?? null,
        'globalFooterHtml' => $settings['global_footer_html'] ?? null,
        'globalFooterCss' => $settings['global_footer_css'] ?? null,
        'logoUrl' => $settings['logo_url'] ?? null,
        'siteName' => $settings['site_name'] ?? null,
        'faviconUrl' => $settings['favicon_url'] ?? null,
        'customCss' => $settings['custom_css'] ?? null,
        'customHeadScripts' => $settings['custom_head_scripts'] ?? null
    ]);
}

// ── GET: صفحه با ID ──
if ($method === 'GET' && $action && $action !== 'slug') {
    $stmt = $db->prepare('SELECT * FROM pages WHERE id = ?');
    $stmt->execute([$action]);
    $page = $stmt->fetch();
    if (!$page) jsonError('صفحه یافت نشد.', 404);
    jsonResponse($page);
}

// ── POST: ایجاد صفحه ──
if ($method === 'POST' && !$action) {
    $auth = requireRole('admin');
    $data = getJsonInput();
    $title = trim($data['title'] ?? '');
    $slug = trim($data['slug'] ?? '');
    if (!$title || !$slug) jsonError('عنوان و مسیر صفحه الزامی است.');

    $slug = strtolower(str_replace([' ', '_'], '-', $slug));

    $stmt = $db->prepare('SELECT id FROM pages WHERE slug = ?');
    $stmt->execute([$slug]);
    if ($stmt->fetch()) jsonError('صفحه‌ای با این مسیر قبلاً وجود دارد.');

    $id = sprintf('%08x-%04x-%04x-%04x-%012x', mt_rand(), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand());
    $stmt = $db->prepare('INSERT INTO pages (id, title, slug, html_content, css_content, grapesjs_state, is_published, meta_description, og_image, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)');
    $stmt->execute([$id, $title, $slug, $data['htmlContent'] ?? null, $data['cssContent'] ?? null, $data['grapesJsState'] ?? null, $data['isPublished'] ?? 1, $data['metaDescription'] ?? null, $data['ogImage'] ?? null, $auth['name']]);

    jsonResponse(['id' => $id, 'message' => 'صفحه با موفقیت ذخیره شد.']);
}

// ── PUT: ویرایش صفحه ──
if ($method === 'PUT' && $action) {
    $auth = requireRole('admin');
    $data = getJsonInput();

    $stmt = $db->prepare('SELECT * FROM pages WHERE id = ?');
    $stmt->execute([$action]);
    if (!$stmt->fetch()) jsonError('صفحه یافت نشد.', 404);

    $slug = strtolower(str_replace([' ', '_'], '-', trim($data['slug'] ?? '')));

    $stmt = $db->prepare('UPDATE pages SET title=?, slug=?, html_content=?, css_content=?, grapesjs_state=?, is_published=?, meta_description=?, og_image=?, updated_at=NOW() WHERE id=?');
    $stmt->execute([
        $data['title'] ?? '',
        $slug,
        $data['htmlContent'] ?? null,
        $data['cssContent'] ?? null,
        $data['grapesJsState'] ?? null,
        $data['isPublished'] ?? 1,
        $data['metaDescription'] ?? null,
        $data['ogImage'] ?? null,
        $action
    ]);

    jsonResponse(['id' => $action, 'message' => 'صفحه بروزرسانی شد.']);
}

// ── DELETE: حذف صفحه ──
if ($method === 'DELETE' && $action) {
    $auth = requireRole('admin');
    $stmt = $db->prepare('DELETE FROM pages WHERE id = ?');
    $stmt->execute([$action]);
    jsonResponse(['message' => 'صفحه حذف شد.']);
}

// ── PUT: تغییر وضعیت انتشار ──
if ($method === 'PUT' && $action && ($segments[1] ?? '') === 'publish') {
    $auth = requireRole('admin');
    $stmt = $db->prepare('UPDATE pages SET is_published = NOT is_published, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$action]);
    $stmt = $db->prepare('SELECT is_published FROM pages WHERE id = ?');
    $stmt->execute([$action]);
    $p = $stmt->fetch();
    jsonResponse(['isPublished' => (bool)$p['is_published']]);
}

jsonError('مسیر یافت نشد.', 404);
