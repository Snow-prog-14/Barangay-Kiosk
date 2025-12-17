<?php
date_default_timezone_set('Asia/Manila');
require 'db_connect.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

// --------------------------------------------------
// ACCEPT EITHER user_id (existing logic)
// OR token (forgot password flow)
// --------------------------------------------------
$user_id = $data['user_id'] ?? null;
$token   = $data['token'] ?? null;

$new_password     = $data['new_password'] ?? null;
$confirm_password = $data['confirm_password'] ?? null;

// --------------------------------------------------
// VALIDATION (UNCHANGED + SAFE)
// --------------------------------------------------
if (!$new_password || !$confirm_password) {
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
    // --------------------------------------------------
    // HASH PASSWORD (UNCHANGED)
    // --------------------------------------------------
    $new_password_hash = password_hash($new_password, PASSWORD_DEFAULT);

    // --------------------------------------------------
    // CASE 1: FORGOT PASSWORD FLOW (TOKEN)
    // --------------------------------------------------
    if ($token) {

        // Validate token
        $stmt = $pdo->prepare(
            "SELECT id FROM users 
             WHERE reset_token = ? 
             AND reset_token_expiry > NOW() 
             AND is_active = 1"
        );
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid or expired reset token.']);
            exit;
        }

        // Update password + clear reset fields
        $stmt = $pdo->prepare(
            "UPDATE users 
             SET password_hash = ?, 
                 must_change_password = 0,
                 reset_token = NULL,
                 reset_token_expiry = NULL
             WHERE id = ?"
        );
        $stmt->execute([$new_password_hash, $user['id']]);

        http_response_code(200);
        echo json_encode(['message' => 'Password reset successfully.']);
        exit;
    }

    // --------------------------------------------------
    // CASE 2: EXISTING LOGIC (LOGGED-IN USER)
    // --------------------------------------------------
    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID is required.']);
        exit;
    }

    $stmt = $pdo->prepare(
        "UPDATE users 
         SET password_hash = ?, must_change_password = 0 
         WHERE id = ?"
    );
    $stmt->execute([$new_password_hash, $user_id]);

    http_response_code(200);
    echo json_encode(['message' => 'Password updated successfully.']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error.']);
}
