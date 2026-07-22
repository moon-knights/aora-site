<?php
// آئورا — API ثبت‌نام
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$segments = array_values(array_filter($segments, function($s) { return $s !== 'api' && $s !== 'enrollment'; }));
$action = $segments[0] ?? '';

// ── GET: دوره‌های من ──
if ($action === 'my' && $method === 'GET') {
    $auth = requireAuth();
    $stmt = $db->prepare('SELECT e.*, c.title AS course_title, c.icon AS course_icon FROM enrollments e LEFT JOIN courses c ON e.course_id = c.id WHERE e.user_id = ? ORDER BY e.enrolled_at DESC');
    $stmt->execute([$auth['sub']]);
    $enrollments = $stmt->fetchAll();

    $data = array_map(function($e) {
        return [
            'id' => (int)$e['id'],
            'courseId' => (int)$e['course_id'],
            'courseTitle' => $e['course_title'] ?? '',
            'courseIcon' => $e['course_icon'] ?? '📚',
            'enrolledAt' => $e['enrolled_at'],
            'progress' => (int)$e['progress'],
            'completedLessons' => $e['completed_lessons'],
            'amountPaid' => (int)$e['amount_paid']
        ];
    }, $enrollments);

    jsonResponse(['success' => true, 'data' => $data]);
}

// ── GET: بررسی ثبت‌نام ──
if ($action === 'check' && isset($segments[1]) && $method === 'GET') {
    $auth = requireAuth();
    $courseId = (int)$segments[1];
    $stmt = $db->prepare('SELECT COUNT(*) FROM enrollments WHERE user_id = ? AND course_id = ?');
    $stmt->execute([$auth['sub'], $courseId]);
    $enrolled = $stmt->fetchColumn() > 0;
    jsonResponse(['success' => true, 'enrolled' => $enrolled]);
}

// ── POST: ثبت‌نام مستقیم (رایگان) ──
if ($method === 'POST' && !$action) {
    $auth = requireAuth();
    $data = getJsonInput();
    $courseId = (int)($data['courseId'] ?? 0);

    $stmt = $db->prepare('SELECT * FROM courses WHERE id = ?');
    $stmt->execute([$courseId]);
    $course = $stmt->fetch();
    if (!$course) jsonError('دوره یافت نشد.', 404);

    $stmt = $db->prepare('SELECT COUNT(*) FROM enrollments WHERE user_id = ? AND course_id = ?');
    $stmt->execute([$auth['sub'], $courseId]);
    if ($stmt->fetchColumn() > 0) jsonError('قبلاً در این دوره ثبت‌نام کرده‌اید.', 409);

    if ((int)$course['price'] > 0) jsonError('این دوره رایگان نیست.');

    $stmt = $db->prepare('INSERT INTO enrollments (user_id, course_id, enrolled_at, progress, completed_lessons, amount_paid) VALUES (?, ?, NOW(), 0, \'[]\', 0)');
    $stmt->execute([$auth['sub'], $courseId]);

    $stmt = $db->prepare('UPDATE courses SET students_count = students_count + 1 WHERE id = ?');
    $stmt->execute([$courseId]);

    jsonResponse(['success' => true, 'message' => 'با موفقیت ثبت‌نام شدید.']);
}

// ── PUT: بروزرسانی پیشرفت ──
if ($method === 'PUT' && is_numeric($action) && isset($segments[1]) && $segments[1] === 'progress') {
    $auth = requireAuth();
    $courseId = (int)$action;
    $data = getJsonInput();

    $stmt = $db->prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?');
    $stmt->execute([$auth['sub'], $courseId]);
    $enrollment = $stmt->fetch();
    if (!$enrollment) jsonError('ثبت‌نامی یافت نشد.', 404);

    $completed = json_decode($enrollment['completed_lessons'] ?? '[]', true) ?: [];
    $lessonId = $data['lessonId'] ?? '';
    if ($lessonId && !in_array($lessonId, $completed)) {
        $completed[] = $lessonId;
    }

    $totalLessons = (int)($data['totalLessons'] ?? 0);
    $progress = $totalLessons > 0 ? min(100, round(100 * count($completed) / $totalLessons)) : 0;

    $stmt = $db->prepare('UPDATE enrollments SET completed_lessons = ?, progress = ? WHERE id = ?');
    $stmt->execute([json_encode($completed, JSON_UNESCAPED_UNICODE), $progress, $enrollment['id']]);

    jsonResponse(['success' => true, 'progress' => (int)$progress, 'completedLessons' => $completed]);
}

jsonError('مسیر یافت نشد.', 404);
