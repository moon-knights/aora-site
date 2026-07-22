<?php
// آئورا — API اساتید
$db = getDB();

$stmt = $db->prepare("SELECT u.id, u.full_name, u.email, u.bio, u.avatar, u.specialty, u.university,
    (SELECT COUNT(*) FROM courses WHERE instructor_id = u.id) AS course_count,
    (SELECT COALESCE(SUM(students_count),0) FROM courses WHERE instructor_id = u.id) AS total_students
    FROM users u WHERE u.role = 'professor' AND u.is_active = 1 ORDER BY u.full_name");
$stmt->execute();
$profs = $stmt->fetchAll();

$data = array_map(function($p) {
    return [
        'id' => 'prof-' . $p['id'],
        'name' => $p['full_name'],
        'title' => $p['specialty'] ?: 'استاد',
        'university' => $p['university'] ?: 'آئورا',
        'specialty' => $p['specialty'] ?: '',
        'courses' => (int)$p['course_count'],
        'students' => (int)$p['total_students'],
        'rating' => 0,
        'publications' => 0,
        'hIndex' => 0,
        'email' => $p['email'],
        'bio' => $p['bio'] ?: '',
        'avatar' => $p['avatar'] ?: ''
    ];
}, $profs);

jsonResponse(['success' => true, 'data' => $data]);
