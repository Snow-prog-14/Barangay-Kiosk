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
            
            $user_id = $data['user_id'] ?? 0;
            $user_name = $data['user_name'] ?? 'System';

            // Add 'form_template' to the check
            if (empty($data['name']) || !isset($data['fee']) || empty($data['form_template'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Name, Fee, and Form Template are required.']);
                exit;
            }

            // Add 'form_template' to the query
            $sql = "INSERT INTO request_types (name, fee, form_template, is_active) VALUES (?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $is_active = $data['is_active'] ? 1 : 0;
            // Add 'form_template' to the execute array
            $stmt->execute([$data['name'], $data['fee'], $data['form_template'], $is_active]);
            $new_type_id = $pdo->lastInsertId();

            // --- Log the Action ---
            $details = "Name: {$data['name']}, Fee: {$data['fee']}, Form: {$data['form_template']}, Active: " . ($is_active ? 'Yes' : 'No');
            log_action($pdo, $new_type_id, $user_id, $user_name, 'Create', $details);
            // --- End Log ---

            http_response_code(201);
            echo json_encode([
                'id' => $new_type_id,
                'name' => $data['name'],
                'fee' => $data['fee'],
                'form_template' => $data['form_template'],
                'is_active' => $is_active
            ]);
            break;

// --- PUT (Update existing type) ---
        case 'PUT':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;
            $is_active_new = $data['is_active'] ? 1 : 0;

            $user_id = $data['user_id'] ?? 0;
            $user_name = $data['user_name'] ?? 'System';

            // Add 'form_template' to the check
            if (!$id || empty($data['name']) || !isset($data['fee']) || empty($data['form_template'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID, Name, Fee, and Form Template are required for update.']);
                exit;
            }

            // --- Get old data for comparison ---
            // Add 'form_template' to the query
            $stmt_check = $pdo->prepare("SELECT name, fee, form_template, is_active FROM request_types WHERE id = ?");
            $stmt_check->execute([$id]);
            $old_data = $stmt_check->fetch(PDO::FETCH_ASSOC);
            // --- End Get old data ---

            $inactive_since_sql = "";
            if ($old_data['is_active'] == 1 && $is_active_new == 0) {
                $inactive_since_sql = ", inactive_since = NOW()";
            } else if ($old_data['is_active'] == 0 && $is_active_new == 1) {
                $inactive_since_sql = ", inactive_since = NULL";
            }

            // Add 'form_template' to the query
            $sql = "UPDATE request_types SET name = ?, fee = ?, form_template = ?, is_active = ? $inactive_since_sql WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            
            // Add 'form_template' to the execute array
            $stmt->execute([$data['name'], $data['fee'], $data['form_template'], $is_active_new, $id]);

            // --- Log the Action ---
            $details_log = [];
            if ($old_data['name'] != $data['name']) {
                $details_log[] = "Name changed from '{$old_data['name']}' to '{$data['name']}'";
            }
            if ($old_data['fee'] != $data['fee']) {
                $details_log[] = "Fee changed from {$old_data['fee']} to {$data['fee']}";
            }
            // Add 'form_template' to the log
            if ($old_data['form_template'] != $data['form_template']) {
                $details_log[] = "Form changed from '{$old_data['form_template']}' to '{$data['form_template']}'";
            }
            if ($old_data['is_active'] != $is_active_new) {
                $details_log[] = "Status changed from " . ($old_data['is_active'] ? 'Active' : 'Inactive') . " to " . ($is_active_new ? 'Active' : 'Inactive');
            }
            
            $type_being_edited = $old_data['name'];
            if (empty($details_log)) {
                $details = "No changes made to type '{$type_being_edited}'.";
            } else {
                $details = "Edited type '{$type_being_edited}': " . implode('; ', $details_log);
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
            
            // Get user info from query string
            $user_id = $_GET['user_id'] ?? 0;
            $user_name = $_GET['user_name'] ?? 'System';

            // --- NEW: Get type's name for the log ---
            $stmt_check = $pdo->prepare("SELECT name FROM request_types WHERE id = ?");
            $stmt_check->execute([$id]);
            $type_name = $stmt_check->fetchColumn();
            // --- END NEW ---

            $sql = "UPDATE request_types SET is_archived = TRUE WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            // --- Log the Action (Now with name) ---
            $details = "Request Type '{$type_name}' was archived.";
            log_action($pdo, $id, $user_id, $user_name, 'Archive', $details);
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