<?php
require __DIR__ . '/db_connect.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents("php://input"), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request"]);
    exit;
}

$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode(["error" => "Missing credentials"]);
    exit;
}

$stmt = $pdo->prepare("
    SELECT id, username, password_hash, full_name, email, role, is_active
    FROM users
    WHERE username = ?
    LIMIT 1
");
$stmt->execute([$username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(["error" => "Invalid username or password"]);
    exit;
}

if ((int)$user['is_active'] !== 1) {
    http_response_code(403);
    echo json_encode(["error" => "Account disabled"]);
    exit;
}

echo json_encode([
    "success" => true,
    "id" => (int)$user['id'],
    "username" => $user['username'],
    "full_name" => $user['full_name'],
    "email" => $user['email'],
    "role" => $user['role'],
    "is_active" => (int)$user['is_active']
]);
