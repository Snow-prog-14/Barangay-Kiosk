<?php
require 'db_connect.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? ''; 

    try {
        // 1. Find the user AND get the new flag
        $stmt = $pdo->prepare("SELECT id, username, password_hash, full_name, role, is_active, must_change_password FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        // 2. Authenticate
        if ($user && $user['is_active'] && password_verify($password, $user['password_hash'])) {
            
            // --- NEW: RECORD THE LOGIN ACTIVITY ---
            $log_sql = "INSERT INTO login_logs (user_id, username) VALUES (?, ?)";
            $log_stmt = $pdo->prepare($log_sql);
            $log_stmt->execute([$user['id'], $user['username']]);
            // --- END NEW ---

            // SUCCESS
            unset($user['password_hash']); // Security: Remove hash
            
            // Convert must_change_password to a real boolean (true/false)
            $user['must_change_password'] = (bool)$user['must_change_password'];

            // Normalize roles for frontend security logic
                $role = strtolower(trim($user['role']));

                $map = [
                    'Staff' => 'staff',
                    'Office admin' => 'office_admin',
                    'Application admin' => 'app_admin',
                    'Admin' => 'app_admin'
                ];

                $user['role'] = $map[$role] ?? 'staff';

            error_log('AUTH ROLE SENT: ' . $role);
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'user' => $user
            ]);
        } else {
            // FAILURE: User not found, inactive, or password wrong
            http_response_code(401);
            echo json_encode(["error" => "Invalid username or password."]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
} else {
    http_response_code(405); // Method Not Allowed
}
?>