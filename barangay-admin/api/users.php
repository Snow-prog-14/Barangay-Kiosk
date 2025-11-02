<?php
require 'db_connect.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
        // --- GET (Fetch all or one) ---
        case 'GET':
            if ($id) {
                // Get single user by ID (for editing)
                // Exclude password_hash for security
                $stmt = $pdo->prepare("SELECT id, full_name, username, role, is_active FROM users WHERE id = ?");
                $stmt->execute([$id]);
                $user = $stmt->fetch();
                echo json_encode($user);
            } else {
                // Get all users
                $stmt = $pdo->query("SELECT id, full_name, username, role, is_active FROM users ORDER BY id ASC");
                $users = $stmt->fetchAll();
                echo json_encode($users);
            }
            break;

        // --- POST (Add new user) ---
// --- POST (Add new user) ---
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Password is no longer required from the form
            if (empty($data['full_name']) || empty($data['username']) || empty($data['role'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Full Name, Username, and Role are required.']);
                exit;
            }

            // --- NEW: Generate a random temporary password ---
            $temporary_password = bin2hex(random_bytes(4)); // Creates an 8-char random string (e.g., "a1b2c3d4")
            $password_hash = password_hash($temporary_password, PASSWORD_DEFAULT);
            // --- END NEW ---

            $is_active = $data['is_active'] ? 1 : 0;

            // We now also set must_change_password = 1
            $sql = "INSERT INTO users (full_name, username, password_hash, role, is_active, must_change_password) VALUES (?, ?, ?, ?, ?, 1)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['full_name'], $data['username'], $password_hash, $data['role'], $is_active]);

            http_response_code(201);
            // Send the temporary password back to the admin
            echo json_encode([
                'message' => 'User created successfully',
                'temporary_password' => $temporary_password 
            ]);
            break;

        // --- PUT (Update existing user) ---
        case 'PUT':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;

            if (!$id || empty($data['full_name']) || empty($data['username']) || empty($data['role'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID, Full Name, Username, and Role are required.']);
                exit;
            }

            // Note: This update does NOT change the password.
            // That should be a separate "Reset Password" function.
            $sql = "UPDATE users SET full_name = ?, username = ?, role = ?, is_active = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $is_active = $data['is_active'] ? 1 : 0;
            $stmt->execute([$data['full_name'], $data['username'], $data['role'], $is_active, $id]);

            echo json_encode(['message' => 'User updated successfully']);
            break;

        // --- DELETE (Deactivate user) ---
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID is required for delete.']);
                exit;
            }

            // Soft delete: set user to inactive
            $sql = "UPDATE users SET is_active = 0 WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            echo json_encode(['message' => 'User deactivated successfully']);
            break;
        
        default:
            http_response_code(405); // Method Not Allowed
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }

} catch (PDOException $e) {
    if ($e->errorInfo[1] == 1062) { // Duplicate username
        http_response_code(409);
        echo json_encode(['error' => 'This username is already taken.']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}
?>