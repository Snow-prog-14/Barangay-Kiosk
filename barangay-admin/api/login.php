<?php
require __DIR__ . '/db_connect.php';

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
    SELECT id, username, password 
    FROM admins 
    WHERE username = ?
    LIMIT 1
");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(["error" => "Invalid username or password"]);
    exit;
}

echo json_encode([
    "success" => true,
    "admin_id" => $user['id'],
    "username" => $user['username']
]);
