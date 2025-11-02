<?php
require 'db_connect.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    // Get data from the frontend
    $user_id = $data['user_id'] ?? null;
    $new_password = $data['new_password'] ?? null;
    $confirm_password = $data['confirm_password'] ?? null;

    // --- Validation ---
    if (!$user_id || !$new_password || !$confirm_password) {
        http_response_code(400);
        echo json_encode(['error' => 'All fields are required.']);
        exit;
    }

    if ($new_password !== $confirm_password) {
        http_response_code(400);
        echo json_encode(['error' => 'Passwords do not match.']);
        exit;
    }

    if (strlen($new_password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 6 characters long.']);
        exit;
    }

    try {
        // --- Update the Database ---
        
        // 1. Hash the new password
        $new_password_hash = password_hash($new_password, PASSWORD_DEFAULT);

        // 2. Update the user's password AND set must_change_password to 0 (false)
        $sql = "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$new_password_hash, $user_id]);

        http_response_code(200);
        echo json_encode(['message' => 'Password updated successfully.']);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }

} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method not allowed.']);
}
?>