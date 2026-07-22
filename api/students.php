<?php
// آئورا — API دانشجویان
$db = getDB();
$auth = requireAuth();

$stmt = $db->prepare("SELECT id, full_name, email, role, created_at FROM users WHERE role = 'student' ORDER BY created_at DESC");
$stmt->execute();
$students = $stmt->fetchAll();

$data = array_map(function($s) {
    return [
        'id' => $s['id'],
        'fullName' => $s['full_name'],
        'email' => $s['email'],
        'role' => $s['role'],
        'createdAt' => $s['created_at']
    ];
}, $students);

jsonResponse(['success' => true, 'data' => $data]);
