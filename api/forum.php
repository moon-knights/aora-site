<?php
// آئورا — API تالار گفتگو
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$segments = array_values(array_filter($segments, function($s) { return $s !== 'api' && $s !== 'forum'; }));
$action = $segments[0] ?? '';

// ── GET: لیست پست‌ها ──
if ($method === 'GET' && !$action) {
    $stmt = $db->query('SELECT p.*, u.full_name AS author_name, u.role AS author_role FROM forum_posts p LEFT JOIN users u ON p.author_id = u.id ORDER BY p.created_at DESC');
    $posts = $stmt->fetchAll();

    $result = [];
    foreach ($posts as $p) {
        $replyStmt = $db->prepare('SELECT r.*, u.full_name AS author_name, u.role AS author_role FROM forum_replies r LEFT JOIN users u ON r.author_id = u.id WHERE r.post_id = ? ORDER BY r.created_at ASC');
        $replyStmt->execute([$p['id']]);
        $replies = $replyStmt->fetchAll();

        $result[] = [
            'id' => (int)$p['id'],
            'title' => $p['title'],
            'content' => $p['content'],
            'category' => $p['category'],
            'author' => $p['author_name'],
            'authorRole' => $p['author_role'],
            'likes' => (int)$p['likes'],
            'views' => (int)$p['views'],
            'createdAt' => $p['created_at'],
            'replies' => array_map(function($r) {
                return [
                    'id' => (int)$r['id'],
                    'content' => $r['content'],
                    'author' => $r['author_name'],
                    'authorRole' => $r['author_role'],
                    'createdAt' => $r['created_at']
                ];
            }, $replies)
        ];
    }
    jsonResponse(['success' => true, 'data' => $result]);
}

// ── POST: ایجاد پست ──
if ($method === 'POST' && !$action) {
    $auth = requireAuth();
    $data = getJsonInput();
    $title = trim($data['title'] ?? '');
    $content = trim($data['content'] ?? '');
    if (!$title || !$content) jsonError('عنوان و متن الزامی است.');

    $stmt = $db->prepare('INSERT INTO forum_posts (title, content, category, author_id, created_at) VALUES (?, ?, ?, ?, NOW())');
    $stmt->execute([$title, $content, $data['category'] ?? 'عمومی', $auth['sub']]);

    jsonResponse(['success' => true, 'data' => ['id' => (int)$db->lastInsertId()]]);
}

// ── POST: پاسخ ──
if ($method === 'POST' && is_numeric($action) && ($segments[1] ?? '') === 'reply') {
    $auth = requireAuth();
    $postId = (int)$action;
    $data = getJsonInput();
    $content = trim($data['content'] ?? '');
    if (!$content) jsonError('متن پاسخ الزامی است.');

    $stmt = $db->prepare('INSERT INTO forum_replies (post_id, content, author_id, created_at) VALUES (?, ?, ?, NOW())');
    $stmt->execute([$postId, $content, $auth['sub']]);

    jsonResponse(['success' => true]);
}

jsonError('مسیر یافت نشد.', 404);
