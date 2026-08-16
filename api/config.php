<?php
// ═══════════════════════════════════════════════════════════
// آئورا — تنظیمات اتصال دیتابیس و API
// ═══════════════════════════════════════════════════════════

// ── تنظیمات MySQL ──
// ⚠️ مقادیر زیر را با اطلاعات دیتابیس واقعی خود جایگزین کنید
define('DB_HOST', 'localhost');
define('DB_NAME', 'cylijgfm_AoraDbContext');        // نام دیتابیس
define('DB_USER', 'cylijgfm_Morteza_Heydari');      // نام کاربری دیتابیس
define('DB_PASS', 'M@o#r$i&8585');  // رمز عبور دیتابیس
define('DB_CHARSET', 'utf8mb4');

// ── JWT Secret Key ──
define('JWT_SECRET', 'AoraSuperSecretKey_1405_MustBe32Chars!');
define('JWT_ISSUER', 'Aora');
define('JWT_EXPIRY', 604800); // 7 روز (به ثانیه)

// ── Zarinpal ──
define('ZARINPAL_MERCHANT', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
define('ZARINPAL_SANDBOX', true);

// ── اتصال دیتابیس ──
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'خطا در اتصال به دیتابیس']);
            exit;
        }
    }
    return $pdo;
}

// ── CORS Headers ──
// محدود کردن به دامنه سایت (در صورت نیاز دامنه خود را اضافه کنید)
$allowedOrigins = [
    'http://localhost',
    'https://localhost',
    'http://127.0.0.1',
    (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '')
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins) || !empty($origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// ── Security Headers ──
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── JSON Body ──
function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

// ── JWT Functions ──
function generateToken($user) {
    $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64_encode(json_encode([
        'sub' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'name' => $user['full_name'],
        'iss' => JWT_ISSUER,
        'iat' => time(),
        'exp' => time() + JWT_EXPIRY
    ]));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

function verifyToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $signature] = $parts;
    $expectedSig = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));

    if (!hash_equals($expectedSig, $signature)) return null;

    $data = json_decode(base64_decode($payload), true);
    if (!$data || $data['exp'] < time()) return null;

    return $data;
}

// ── دریافت کاربر فعلی از توکن ──
function getCurrentUser() {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) return null;
    return verifyToken($m[1]);
}

// ── بررسی لاگین ──
function requireAuth() {
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'وارد نشده‌اید.']);
        exit;
    }
    return $user;
}

// ── بررسی نقش ──
function requireRole(...$roles) {
    $user = requireAuth();
    if (!in_array($user['role'], $roles)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'شما اجازه دسترسی به این بخش را ندارید.']);
        exit;
    }
    return $user;
}

// ── پاسخ موفق ──
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── پاسخ خطا ──
function jsonError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
