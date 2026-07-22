<?php
// ═══════════════════════════════════════════════════════════
// آئورا — API احراز هویت
// ═══════════════════════════════════════════════════════════

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
// حذف 'api' و 'auth' از ابتدای segments
$segments = array_values(array_filter($segments, function($s) { return $s !== 'api' && $s !== 'auth'; }));
$action = $segments[0] ?? '';

// ── ثبت‌نام ──
if ($action === 'register' && $method === 'POST') {
    $data = getJsonInput();
    $fullName = trim($data['fullName'] ?? '');
    $email = trim(strtolower($data['email'] ?? ''));
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? 'student';

    if (!$fullName) jsonError('نام الزامی است.');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('ایمیل معتبر وارد کنید.');
    if (!$password || strlen($password) < 6) jsonError('رمز عبور حداقل ۶ کاراکتر.');

    // فقط دانشجو مجاز به ثبت‌نام عمومی
    $safeRole = in_array($role, ['professor', 'admin']) ? 'student' : $role;

    // بررسی تکراری
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) jsonError('این ایمیل قبلاً ثبت شده است.');

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $db->prepare('INSERT INTO users (full_name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())');
    $stmt->execute([$fullName, $email, $hash, $safeRole]);
    $userId = $db->lastInsertId();

    $user = ['id' => (int)$userId, 'full_name' => $fullName, 'email' => $email, 'role' => $safeRole];
    $token = generateToken($user);

    jsonResponse([
        'success' => true,
        'user' => [
            'id' => (int)$userId,
            'fullName' => $fullName,
            'email' => $email,
            'role' => $safeRole
        ],
        'token' => $token
    ]);
}

// ── ورود ──
if ($action === 'login' && $method === 'POST') {
    $data = getJsonInput();
    $email = trim(strtolower($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    if (!$email || !$password) jsonError('ایمیل و رمز را وارد کنید.');

    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonError('ایمیل یا رمز عبور اشتباه است.', 401);
    }

    if (!$user['is_active']) {
        jsonError('حساب کاربری غیرفعال شده است.', 403);
    }

    // بروزرسانی آخرین ورود
    $stmt = $db->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
    $stmt->execute([$user['id']]);

    $tokenData = ['id' => (int)$user['id'], 'full_name' => $user['full_name'], 'email' => $user['email'], 'role' => $user['role']];
    $token = generateToken($tokenData);

    jsonResponse([
        'success' => true,
        'user' => [
            'id' => (int)$user['id'],
            'fullName' => $user['full_name'],
            'email' => $user['email'],
            'role' => $user['role']
        ],
        'token' => $token
    ]);
}

// ── پروفایل من ──
if ($action === 'me' && $method === 'GET') {
    $auth = requireAuth();
    $stmt = $db->prepare('SELECT id, full_name, email, role, bio, phone, university, gender, father_name, national_code, avatar FROM users WHERE id = ?');
    $stmt->execute([$auth['sub']]);
    $user = $stmt->fetch();
    if (!$user) jsonError('کاربر یافت نشد.', 404);

    $user['id'] = (int)$user['id'];
    $user['fullName'] = $user['full_name'];
    $user['fatherName'] = $user['father_name'];
    $user['nationalCode'] = $user['national_code'];
    unset($user['full_name'], $user['father_name'], $user['national_code']);
    jsonResponse($user);
}

// ── بروزرسانی پروفایل ──
if ($action === 'profile' && $method === 'PUT') {
    $auth = requireAuth();
    $data = getJsonInput();

    $fields = [];
    $params = [];

    if (isset($data['fullName'])) { $fields[] = 'full_name = ?'; $params[] = $data['fullName']; }
    if (isset($data['bio'])) { $fields[] = 'bio = ?'; $params[] = $data['bio']; }
    if (isset($data['phone'])) { $fields[] = 'phone = ?'; $params[] = $data['phone']; }
    if (isset($data['university'])) { $fields[] = 'university = ?'; $params[] = $data['university']; }
    if (isset($data['specialty'])) { $fields[] = 'specialty = ?'; $params[] = $data['specialty']; }

    if (empty($fields)) jsonError('هیچ فیلدی برای بروزرسانی ارسال نشد.');

    $params[] = $auth['sub'];
    $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['success' => true]);
}

jsonError('مسیر یافت نشد.', 404);
