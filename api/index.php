<?php
// ═══════════════════════════════════════════════════════════
// آئورا — روتر اصلی API
// ═══════════════════════════════════════════════════════════

require_once __DIR__ . '/config.php';

// ── بررسی حالت تعمیرات ──
// اگر maintenance_mode در دیتابیس فعال باشد، فقط ادمین‌ها اجازه دسترسی دارند
try {
    $maintDb = getDB();
    $maintStmt = $maintDb->query('SELECT maintenance_mode FROM site_settings WHERE id = 1');
    $maintSettings = $maintStmt->fetch();
    if ($maintSettings && (int)$maintSettings['maintenance_mode'] === 1) {
        $currentUser = getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            http_response_code(503);
            echo json_encode([
                'success' => false,
                'message' => 'سایت در حال بروزرسانی است. لطفاً چند دقیقه دیگر مراجعه کنید.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
} catch (Exception $e) {
    // اگر خطا رخ داد، ادامه بده
}

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/');

// حذف /api از ابتدای مسیر (اگر وجود داشت)
if (strpos($uri, '/api') === 0) {
    $uri = substr($uri, 4);
}

// مسیریابی
$segments = explode('/', trim($uri, '/'));
$resource = $segments[0] ?? '';

switch ($resource) {
    case 'auth':
        require __DIR__ . '/auth.php';
        break;
    case 'courses':
        require __DIR__ . '/courses.php';
        break;
    case 'enrollment':
        require __DIR__ . '/enrollment.php';
        break;
    case 'forum':
        require __DIR__ . '/forum.php';
        break;
    case 'admin':
        require __DIR__ . '/admin.php';
        break;
    case 'meetings':
        require __DIR__ . '/meetings.php';
        break;
    case 'surveys':
        require __DIR__ . '/surveys.php';
        break;
    case 'payment':
        require __DIR__ . '/payment.php';
        break;
    case 'settings':
        require __DIR__ . '/settings.php';
        break;
    case 'pages':
        require __DIR__ . '/pages.php';
        break;
    case 'professors':
        require __DIR__ . '/professors.php';
        break;
    case 'students':
        require __DIR__ . '/students.php';
        break;
    default:
        jsonError('مسیر API یافت نشد: /' . $resource, 404);
}
