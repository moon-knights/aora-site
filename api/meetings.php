<?php
// آئورا — API جلسات
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$segments = array_values(array_filter($segments, function($s) { return $s !== 'api' && $s !== 'meetings'; }));
$action = $segments[0] ?? '';

// ── GET: لیست جلسات (ادمین) ──
if ($method === 'GET' && !$action) {
    $auth = requireRole('admin');
    $stmt = $db->query('SELECT * FROM meetings ORDER BY created_at DESC');
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

// ── POST: ایجاد جلسه ──
if ($method === 'POST' && !$action) {
    $auth = requireRole('admin');
    $data = getJsonInput();
    $title = trim($data['title'] ?? '');
    if (!$title) jsonError('عنوان جلسه الزامی است.');

    $chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    $code = '';
    for ($i = 0; $i < 10; $i++) {
        if ($i === 3 || $i === 6) $code .= '-';
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }

    $stmt = $db->prepare('INSERT INTO meetings (title, host, code, creator_id, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    $stmt->execute([$title, $data['host'] ?? '', $code, $auth['sub'], 'scheduled']);

    jsonResponse(['success' => true, 'data' => ['id' => (int)$db->lastInsertId(), 'title' => $title, 'code' => $code]]);
}

// ── GET: دریافت با کد ──
if ($method === 'GET' && $action === 'bycode' && isset($segments[1])) {
    $auth = requireRole('admin');
    $stmt = $db->prepare('SELECT * FROM meetings WHERE code = ?');
    $stmt->execute([$segments[1]]);
    $meeting = $stmt->fetch();
    if (!$meeting) jsonError('جلسه یافت نشد.', 404);
    jsonResponse(['success' => true, 'data' => $meeting]);
}

// ── DELETE: حذف جلسه ──
if ($method === 'DELETE' && is_numeric($action)) {
    $auth = requireRole('admin');
    $stmt = $db->prepare('DELETE FROM meetings WHERE id = ?');
    $stmt->execute([(int)$action]);
    jsonResponse(['success' => true]);
}

jsonError('مسیر یافت نشد.', 404);
