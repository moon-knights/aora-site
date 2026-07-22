<?php
// آئورا — API پرداخت
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$segments = array_values(array_filter($segments, function($s) { return $s !== 'api' && $s !== 'payment'; }));
$action = $segments[0] ?? '';

// ── POST: درخواست پرداخت ──
if ($action === 'request' && $method === 'POST') {
    $auth = requireAuth();
    $data = getJsonInput();
    $courseIds = $data['courseIds'] ?? [];
    if (empty($courseIds)) jsonError('دوره‌ای انتخاب نشده.');

    $placeholders = implode(',', array_fill(0, count($courseIds), '?'));
    $stmt = $db->prepare("SELECT * FROM courses WHERE id IN ($placeholders)");
    $stmt->execute($courseIds);
    $courses = $stmt->fetchAll();
    if (empty($courses)) jsonError('دوره‌ای یافت نشد.', 404);

    // بررسی ثبت‌نام قبلی
    $stmt = $db->prepare("SELECT course_id FROM enrollments WHERE user_id = ? AND course_id IN ($placeholders)");
    $stmt->execute(array_merge([$auth['sub']], $courseIds));
    $alreadyEnrolled = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $toBuy = array_filter($courses, function($c) use ($alreadyEnrolled) {
        return !in_array($c['id'], $alreadyEnrolled);
    });
    if (empty($toBuy)) jsonError('قبلاً در تمام این دوره‌ها ثبت‌نام کرده‌اید.');

    $amount = array_sum(array_map(function($c) { return (int)$c['price']; }, $toBuy));
    $authority = 'AORA_' . bin2hex(random_bytes(10));

    $firstCourse = array_values($toBuy)[0];
    $stmt = $db->prepare('INSERT INTO payment_transactions (authority, amount, user_id, course_id, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    $stmt->execute([$authority, $amount, $auth['sub'], $firstCourse['id'], 'pending']);

    $callbackBase = '/payment-callback.html';
    $paymentUrl = "$callbackBase?Status=OK&Authority=$authority";

    jsonResponse(['success' => true, 'data' => ['authority' => $authority, 'amount' => $amount, 'paymentUrl' => $paymentUrl]]);
}

// ── POST: تایید پرداخت ──
if ($action === 'verify' && $method === 'POST') {
    $auth = requireAuth();
    $data = getJsonInput();
    $authority = $data['authority'] ?? '';
    if (!$authority) jsonError('Authority الزامی است.');

    $stmt = $db->prepare('SELECT * FROM payment_transactions WHERE authority = ? AND user_id = ?');
    $stmt->execute([$authority, $auth['sub']]);
    $tx = $stmt->fetch();
    if (!$tx) jsonError('تراکنش یافت نشد.', 404);

    if ($tx['status'] === 'completed') {
        jsonResponse(['success' => true, 'data' => ['refId' => $tx['ref_id']]]);
    }

    $refId = random_int(1000000000, 9999999999);
    $stmt = $db->prepare('UPDATE payment_transactions SET status = ?, ref_id = ?, completed_at = NOW() WHERE id = ?');
    $stmt->execute(['completed', $refId, $tx['id']]);

    // ثبت‌نام
    $stmt = $db->prepare('SELECT COUNT(*) FROM enrollments WHERE user_id = ? AND course_id = ?');
    $stmt->execute([$auth['sub'], $tx['course_id']]);
    if ($stmt->fetchColumn() == 0) {
        $stmt = $db->prepare('INSERT INTO enrollments (user_id, course_id, enrolled_at, progress, completed_lessons, payment_ref_id, amount_paid) VALUES (?, ?, NOW(), 0, ?, ?, ?)');
        $stmt->execute([$auth['sub'], $tx['course_id'], '[]', $refId, $tx['amount']]);

        $stmt = $db->prepare('UPDATE courses SET students_count = students_count + 1 WHERE id = ?');
        $stmt->execute([$tx['course_id']]);
    }

    jsonResponse(['success' => true, 'data' => ['refId' => $refId]]);
}

jsonError('مسیر یافت نشد.', 404);
