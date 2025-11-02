<?php
require 'db_connect.php';
header('Content-Type: application/json');

function log_action($pdo, $request_type_id, $user_id, $user_name, $action, $details) {
    try {
        $log_sql = "INSERT INTO request_type_logs (request_type_id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)";
        $log_stmt = $pdo->prepare($log_sql);
        $log_stmt->execute([$request_type_id, $user_id, $user_name, $action, $details]);
    } catch (PDOException $e) {
       
    }
}


$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
       
// --- GET (Fetch all or one) ---
    case 'GET':
        if ($id) {
            // Get single type by ID (for editing)
            $stmt = $pdo->prepare("SELECT * FROM request_types WHERE id = ?");
            $stmt->execute([$id]);
            $type = $stmt->fetch();
            echo json_encode($type);
        } else {
            // --- THIS IS THE FIX ---
            // Get all types that are NOT archived (active or inactive)
            $stmt = $pdo->query("SELECT id, name, fee, is_active FROM request_types WHERE is_archived = FALSE ORDER BY id ASC");
            $types = $stmt->fetchAll();
            echo json_encode($types);
        }
        break;
// --- POST (Add new type) ---
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Get user info from frontend (will be null for now, that's ok)
            $user_id = $data['user_id'] ?? 0;
            $user_name = $data['user_name'] ?? 'System';

            if (empty($data['name']) || !isset($data['fee'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Name and Fee are required.']);
                exit;
            }

            $sql = "INSERT INTO request_types (name, fee, is_active) VALUES (?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $is_active = $data['is_active'] ? 1 : 0;
            $stmt->execute([$data['name'], $data['fee'], $is_active]);
            $new_type_id = $pdo->lastInsertId();

            // --- Log the Action ---
            $details = "Name: {$data['name']}, Fee: {$data['fee']}, Active: " . ($is_active ? 'Yes' : 'No');
            log_action($pdo, $new_type_id, $user_id, $user_name, 'Create', $details);
            // --- End Log ---

            http_response_code(201);
            echo json_encode([
                'id' => $new_type_id,
                'name' => $data['name'],
                'fee' => $data['fee'],
                'is_active' => $is_active
            ]);
            break;

// --- PUT (Update existing type) ---
        case 'PUT':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;
            $is_active_new = $data['is_active'] ? 1 : 0;

            // Get user info
            $user_id = $data['user_id'] ?? 0;
            $user_name = $data['user_name'] ?? 'System';

            if (!$id || empty($data['name']) || !isset($data['fee'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID, Name, and Fee are required for update.']);
                exit;
            }

            // --- Get old data for comparison ---
            $stmt_check = $pdo->prepare("SELECT name, fee, is_active FROM request_types WHERE id = ?");
            $stmt_check->execute([$id]);
            $old_data = $stmt_check->fetch(PDO::FETCH_ASSOC);
            // --- End Get old data ---

            $inactive_since_sql = "";
            if ($old_data['is_active'] == 1 && $is_active_new == 0) {
                $inactive_since_sql = ", inactive_since = NOW()";
            } else if ($old_data['is_active'] == 0 && $is_active_new == 1) {
                $inactive_since_sql = ", inactive_since = NULL";
            }

            $sql = "UPDATE request_types SET name = ?, fee = ?, is_active = ? $inactive_since_sql WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['name'], $data['fee'], $is_active_new, $id]);

            // --- Log the Action ---
            $details_log = [];
            if ($old_data['name'] != $data['name']) {
                $details_log[] = "Name changed from '{$old_data['name']}' to '{$data['name']}'";
            }
            if ($old_data['fee'] != $data['fee']) {
                $details_log[] = "Fee changed from {$old_data['fee']} to {$data['fee']}";
            }
            if ($old_data['is_active'] != $is_active_new) {
                $details_log[] = "Status changed from " . ($old_data['is_active'] ? 'Active' : 'Inactive') . " to " . ($is_active_new ? 'Active' : 'Inactive');
            }
            
            if (empty($details_log)) {
                $details = "No changes made.";
            } else {
                $details = implode('; ', $details_log);
            }
            log_action($pdo, $id, $user_id, $user_name, 'Edit', $details);
            // --- End Log ---

            echo json_encode(['message' => 'Type updated successfully']);
            break;

// --- DELETE (Archive the type) ---
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID is required for delete.']);
                exit;
            }
            
            // --- Get user info ---
            // Note: We'll get user info from the frontend in the next step
            // For now, we'll get it from the query string as a fallback
            $user_id = $_GET['user_id'] ?? 0;
            $user_name = $_GET['user_name'] ?? 'System';
            // --- End Get user info ---


            $sql = "UPDATE request_types SET is_archived = TRUE WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            // --- Log the Action ---
            log_action($pdo, $id, $user_id, $user_name, 'Archive', 'Item was archived.');
            // --- End Log ---

            echo json_encode(['message' => 'Type archived successfully']);
            break;
        
        default:
            http_response_code(405); // Method Not Allowed
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }

} catch (PDOException $e) {
    if ($e->errorInfo[1] == 1062) {
        http_response_code(409); // Conflict (duplicate name)
        echo json_encode(['error' => 'A request type with this name already exists.']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}
?>