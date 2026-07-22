<?php
// آئورا — API ادمین
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$segments = array_values(array_filter($segments, function($s) { return $s !== 'api' && $s !== 'admin'; }));
$action = $segments[0] ?? '';

$auth = requireRole('admin');

// ── GET: آمار ──
if ($action === 'stats' && $method === 'GET') {
    $stats = [
        'totalUsers' => (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn(),
        'totalStudents' => (int)$db->query("SELECT COUNT(*) FROM users WHERE role='student'")->fetchColumn(),
        'totalProfessors' => (int)$db->query("SELECT COUNT(*) FROM users WHERE role='professor'")->fetchColumn(),
        'totalCourses' => (int)$db->query('SELECT COUNT(*) FROM courses')->fetchColumn(),
        'totalSurveys' => (int)$db->query('SELECT COUNT(*) FROM surveys')->fetchColumn(),
        'totalEnrollments' => (int)$db->query('SELECT COUNT(*) FROM enrollments')->fetchColumn(),
        'totalRevenue' => (int)($db->query('SELECT COALESCE(SUM(amount_paid),0) FROM enrollments')->fetchColumn())
    ];
    jsonResponse(['success' => true, 'data' => $stats]);
}

// ── GET: لیست کاربران ──
if ($action === 'users' && $method === 'GET') {
    $stmt = $db->query('SELECT id, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
    $users = $stmt->fetchAll();
    $data = array_map(function($u) {
        return [
            'id' => (int)$u['id'],
            'fullName' => $u['full_name'],
            'email' => $u['email'],
            'role' => $u['role'],
            'isActive' => (bool)$u['is_active'],
            'createdAt' => $u['created_at']
        ];
    }, $users);
    jsonResponse(['success' => true, 'data' => $data]);
}

// ── POST: ایجاد کاربر توسط ادمین ──
if ($action === 'users' && $method === 'POST') {
    $data = getJsonInput();
    $fullName = trim($data['fullName'] ?? '');
    $email = trim(strtolower($data['email'] ?? ''));
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? 'student';

    if (!$fullName || !$email || !$password) jsonError('نام، ایمیل و رمز الزامی است.');

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) jsonError('این ایمیل قبلاً ثبت شده.');

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $db->prepare('INSERT INTO users (full_name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())');
    $stmt->execute([$fullName, $email, $hash, $role]);

    jsonResponse(['success' => true, 'data' => ['id' => (int)$db->lastInsertId()]]);
}

// ── DELETE: حذف کاربر ──
if ($action === 'users' && $method === 'DELETE' && isset($segments[1])) {
    $userId = (int)$segments[1];
    $stmt = $db->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    jsonResponse(['success' => true]);
}

jsonError('مسیر یافت نشد.', 404);
