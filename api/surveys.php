<?php
// آئورا — API نظرسنجی‌ها
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$segments = array_values(array_filter($segments, function($s) { return $s !== 'api' && $s !== 'surveys'; }));
$action = $segments[0] ?? '';

// ── GET: لیست نظرسنجی‌ها (ادمین) ──
if ($method === 'GET' && !$action) {
    $auth = requireRole('admin');
    $stmt = $db->query('SELECT * FROM surveys ORDER BY created_at DESC');
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
}

// ── GET: نتایج ──
if ($method === 'GET' && is_numeric($action) && ($segments[1] ?? '') === 'results') {
    $auth = requireRole('admin');
    $stmt = $db->prepare('SELECT * FROM survey_responses WHERE survey_id = ? ORDER BY submitted_at DESC');
    $stmt->execute([(int)$action]);
    $responses = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $responses, 'total' => count($responses)]);
}

// ── GET: دریافت یک نظرسنجی ──
if ($method === 'GET' && is_numeric($action) && !isset($segments[1])) {
    $auth = requireRole('admin');
    $stmt = $db->prepare('SELECT * FROM surveys WHERE id = ?');
    $stmt->execute([(int)$action]);
    $survey = $stmt->fetch();
    if (!$survey) jsonError('نظرسنجی یافت نشد.', 404);
    jsonResponse(['success' => true, 'data' => $survey]);
}

// ── POST: ایجاد نظرسنجی ──
if ($method === 'POST' && !$action) {
    $auth = requireRole('admin');
    $data = getJsonInput();
    $title = trim($data['title'] ?? '');
    if (!$title) jsonError('عنوان نظرسنجی الزامی است.');

    $stmt = $db->prepare('INSERT INTO surveys (title, description, creator_id, questions, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    $stmt->execute([$title, $data['description'] ?? '', $auth['sub'], $data['questions'] ?? '[]', 'active']);

    jsonResponse(['success' => true, 'data' => ['id' => (int)$db->lastInsertId()]]);
}

// ── POST: پاسخدهی (عمومی) ──
if ($method === 'POST' && is_numeric($action) && ($segments[1] ?? '') === 'respond') {
    $data = getJsonInput();
    $stmt = $db->prepare('SELECT * FROM surveys WHERE id = ? AND status = ?');
    $stmt->execute([(int)$action, 'active']);
    $survey = $stmt->fetch();
    if (!$survey) jsonError('نظرسنجی فعال نیست.', 400);

    $stmt = $db->prepare('INSERT INTO survey_responses (survey_id, answers, respondent_email, submitted_at) VALUES (?, ?, ?, NOW())');
    $stmt->execute([(int)$action, $data['answers'] ?? '{}', $data['email'] ?? null]);

    jsonResponse(['success' => true]);
}

// ── DELETE: حذف نظرسنجی ──
if ($method === 'DELETE' && is_numeric($action)) {
    $auth = requireRole('admin');
    $stmt = $db->prepare('DELETE FROM surveys WHERE id = ?');
    $stmt->execute([(int)$action]);
    jsonResponse(['success' => true]);
}

jsonError('مسیر یافت نشد.', 404);
