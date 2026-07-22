<?php
// ═══════════════════════════════════════════════════════════
// آئورا — API دوره‌ها
// ═══════════════════════════════════════════════════════════

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$segments = array_values(array_filter($segments, function($s) { return $s !== 'api' && $s !== 'courses'; }));
$id = null;

// بررسی اینکه آیا عددی به عنوان ID ارسال شده
if (isset($segments[0]) && is_numeric($segments[0])) {
    $id = (int)$segments[0];
}

// ── GET: لیست دوره‌ها (عمومی) ──
if ($method === 'GET' && !$id) {
    $where = ['c.is_published = 1'];
    $params = [];

    $q = $_GET['q'] ?? '';
    $category = $_GET['category'] ?? '';
    $level = $_GET['level'] ?? '';

    if ($category && $category !== 'all') {
        $where[] = 'c.category = ?';
        $params[] = $category;
    }
    if ($level && $level !== 'all') {
        $where[] = 'c.level = ?';
        $params[] = $level;
    }
    if ($q) {
        $where[] = '(c.title LIKE ? OR c.description LIKE ? OR u.full_name LIKE ?)';
        $qParam = "%$q%";
        $params[] = $qParam;
        $params[] = $qParam;
        $params[] = $qParam;
    }

    $whereClause = implode(' AND ', $where);
    $sql = "SELECT c.*, u.full_name AS instructor_name
            FROM courses c
            LEFT JOIN users u ON c.instructor_id = u.id
            WHERE $whereClause
            ORDER BY c.students_count DESC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $courses = $stmt->fetchAll();

    $list = array_map(function($c) {
        return [
            'id' => (int)$c['id'],
            'title' => $c['title'],
            'description' => $c['description'],
            'price' => (int)$c['price'],
            'originalPrice' => (int)$c['original_price'],
            'level' => $c['level'],
            'duration' => $c['duration'],
            'category' => $c['category'],
            'icon' => $c['icon'],
            'image' => $c['image'],
            'rating' => (float)$c['rating'],
            'students' => (int)$c['students_count'],
            'featured' => (bool)$c['is_featured'],
            'tags' => json_decode($c['tags'] ?? '[]', true) ?: [],
            'instructor' => $c['instructor_name'] ?? '',
            'instructorId' => (int)$c['instructor_id']
        ];
    }, $courses);

    jsonResponse(['success' => true, 'data' => $list]);
}

// ── GET: جزئیات یک دوره (عمومی) ──
if ($method === 'GET' && $id) {
    $stmt = $db->prepare('SELECT c.*, u.full_name AS instructor_name FROM courses c LEFT JOIN users u ON c.instructor_id = u.id WHERE c.id = ?');
    $stmt->execute([$id]);
    $course = $stmt->fetch();
    if (!$course) jsonError('دوره یافت نشد.', 404);

    jsonResponse([
        'success' => true,
        'data' => [
            'id' => (int)$course['id'],
            'title' => $course['title'],
            'description' => $course['description'],
            'price' => (int)$course['price'],
            'originalPrice' => (int)$course['original_price'],
            'level' => $course['level'],
            'duration' => $course['duration'],
            'category' => $course['category'],
            'icon' => $course['icon'],
            'image' => $course['image'],
            'rating' => (float)$course['rating'],
            'students' => (int)$course['students_count'],
            'featured' => (bool)$course['is_featured'],
            'tags' => json_decode($course['tags'] ?? '[]', true) ?: [],
            'chapters' => json_decode($course['chapters'] ?? '[]', true) ?: [],
            'instructor' => $course['instructor_name'] ?? '',
            'instructorId' => (int)$course['instructor_id']
        ]
    ]);
}

// ── POST: ایجاد دوره (ادمین/استاد) ──
if ($method === 'POST' && !$id) {
    $auth = requireRole('admin', 'professor');
    $data = getJsonInput();

    $title = trim($data['title'] ?? '');
    if (!$title) jsonError('عنوان دوره الزامی است.');

    $instructorId = $data['instructorId'] ?? $auth['sub'];
    $price = (int)($data['price'] ?? 0);
    $originalPrice = (int)($data['originalPrice'] ?? 0);
    if ($originalPrice <= 0) $originalPrice = $price;

    $stmt = $db->prepare('INSERT INTO courses (title, description, instructor_id, price, original_price, level, duration, category, icon, image, tags, chapters, is_published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())');
    $stmt->execute([
        $title,
        $data['description'] ?? '',
        $instructorId,
        $price,
        $originalPrice,
        $data['level'] ?? 'مبتدی',
        $data['duration'] ?? '',
        $data['category'] ?? '',
        $data['icon'] ?? '📚',
        $data['image'] ?? '',
        json_encode($data['tags'] ?? [], JSON_UNESCAPED_UNICODE),
        json_encode($data['chapters'] ?? [], JSON_UNESCAPED_UNICODE)
    ]);

    $courseId = $db->lastInsertId();
    jsonResponse(['success' => true, 'data' => ['id' => (int)$courseId], 'message' => 'دوره ایجاد شد.']);
}

// ── PUT: ویرایش دوره ──
if ($method === 'PUT' && $id) {
    $auth = requireRole('admin', 'professor');
    $data = getJsonInput();

    $stmt = $db->prepare('SELECT * FROM courses WHERE id = ?');
    $stmt->execute([$id]);
    $course = $stmt->fetch();
    if (!$course) jsonError('دوره یافت نشد.', 404);

    // بررسی دسترسی
    if ($auth['role'] !== 'admin' && $course['instructor_id'] != $auth['sub']) {
        jsonError('شما اجازه ویرایش این دوره را ندارید.', 403);
    }

    $fields = [];
    $params = [];

    if (isset($data['title'])) { $fields[] = 'title = ?'; $params[] = $data['title']; }
    if (isset($data['description'])) { $fields[] = 'description = ?'; $params[] = $data['description']; }
    if (isset($data['price'])) { $fields[] = 'price = ?'; $params[] = (int)$data['price']; }
    if (isset($data['originalPrice'])) { $fields[] = 'original_price = ?'; $params[] = (int)$data['originalPrice']; }
    if (isset($data['level'])) { $fields[] = 'level = ?'; $params[] = $data['level']; }
    if (isset($data['duration'])) { $fields[] = 'duration = ?'; $params[] = $data['duration']; }
    if (isset($data['category'])) { $fields[] = 'category = ?'; $params[] = $data['category']; }
    if (isset($data['icon'])) { $fields[] = 'icon = ?'; $params[] = $data['icon']; }
    if (isset($data['image'])) { $fields[] = 'image = ?'; $params[] = $data['image']; }
    if (isset($data['tags'])) { $fields[] = 'tags = ?'; $params[] = json_encode($data['tags'], JSON_UNESCAPED_UNICODE); }
    if (isset($data['chapters'])) { $fields[] = 'chapters = ?'; $params[] = json_encode($data['chapters'], JSON_UNESCAPED_UNICODE); }
    if (isset($data['isPublished'])) { $fields[] = 'is_published = ?'; $params[] = $data['isPublished'] ? 1 : 0; }
    if (isset($data['featured'])) { $fields[] = 'is_featured = ?'; $params[] = $data['featured'] ? 1 : 0; }
    if (isset($data['rating'])) { $fields[] = 'rating = ?'; $params[] = (float)$data['rating']; }

    if (empty($fields)) jsonError('هیچ فیلدی برای بروزرسانی ارسال نشد.');

    $params[] = $id;
    $sql = 'UPDATE courses SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['success' => true, 'message' => 'دوره بروزرسانی شد.']);
}

// ── DELETE: حذف دوره ──
if ($method === 'DELETE' && $id) {
    $auth = requireRole('admin', 'professor');

    $stmt = $db->prepare('SELECT instructor_id FROM courses WHERE id = ?');
    $stmt->execute([$id]);
    $course = $stmt->fetch();
    if (!$course) jsonError('دوره یافت نشد.', 404);

    if ($auth['role'] !== 'admin' && $course['instructor_id'] != $auth['sub']) {
        jsonError('شما اجازه حذف این دوره را ندارید.', 403);
    }

    $stmt = $db->prepare('DELETE FROM courses WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(['success' => true, 'message' => 'دوره حذف شد.']);
}

jsonError('مسیر یافت نشد.', 404);
