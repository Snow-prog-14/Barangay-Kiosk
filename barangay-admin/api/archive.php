<?php
require 'db_connect.php';
header('Content-Type: application/json');

// --- HELPER FUNCTIONS ---
/**
 * Helper function to create a request type log entry.
 */
function log_action($pdo, $request_type_id, $user_id, $user_name, $action, $details) {
    try {
        $log_sql = "INSERT INTO request_type_logs (request_type_id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)";
        $log_stmt = $pdo->prepare($log_sql);
        $log_stmt->execute([$request_type_id, $user_id, $user_name, $action, $details]);
    } catch (PDOException $e) { /* Silently fail */ }
}

/**
 * Helper function to create a user audit log entry.
 */
function log_user_action($pdo, $user_id, $admin_id, $admin_name, $action, $details) {
    try {
        $log_sql = "INSERT INTO user_action_logs (user_id, admin_user_id, admin_user_name, action, details) VALUES (?, ?, ?, ?, ?)";
        $log_stmt = $pdo->prepare($log_sql);
        $log_stmt->execute([$user_id, $admin_id, $admin_name, $action, $details]);
    } catch (PDOException $e) { /* Silently fail */ }
}

/**
 * Helper function to create a citizen audit log entry.
 */
function log_citizen_action($pdo, $citizen_id, $admin_id, $admin_name, $action, $details) {
    try {
        $log_sql = "INSERT INTO citizen_action_logs (citizen_id, admin_user_id, admin_user_name, action, details) VALUES (?, ?, ?, ?, ?)";
        $log_stmt = $pdo->prepare($log_sql);
        $log_stmt->execute([$citizen_id, $admin_id, $admin_name, $action, $details]);
    } catch (PDOException $e) { /* Silently fail */ }
}
// --- END HELPER FUNCTIONS ---


$method = $_SERVER['REQUEST_METHOD'];
$category = $_GET['category'] ?? 'All'; 
$category = ucfirst(strtolower($category));

try {
    if ($method === 'GET') {
        // ... (Your existing GET logic) ...
        $all_archives = [];

// 1. Fetch Archived Citizens
        if ($category === 'All' || $category === 'Citizens') {
            $stmt_citizens = $pdo->query("
                SELECT 
                    c.id, c.full_name, 
                    cal.timestamp AS date_archived,
                    cal.admin_user_name AS archived_by
                FROM citizens c
                LEFT JOIN citizen_action_logs cal ON c.id = cal.citizen_id
                WHERE c.is_active = 0 AND (cal.action = 'Archive' OR cal.action IS NULL)
                GROUP BY c.id
            ");
            while ($row = $stmt_citizens->fetch(PDO::FETCH_ASSOC)) {
                $all_archives[] = [
                    // Fallback to registered_at if no log exists
                    'date_archived' => $row['date_archived'] ?? $row['registered_at'], 
                    'category' => 'Citizen',
                    'details' => $row['full_name'],
                    'archived_by' => $row['archived_by'] ?? 'N/A', // Use the log's admin name
                    'action_id' => 'citizen-' . $row['id']
                ];
            }
        }

        // 2. Fetch Archived Request Types
        if ($category === 'All' || $category === 'Types' || $category === 'Request type') {
            $stmt_types = $pdo->query("
                SELECT 
                    rt.id, rt.name, rtl.timestamp AS date_archived, rtl.user_name AS archived_by
                FROM request_types rt
                LEFT JOIN request_type_logs rtl ON rt.id = rtl.request_type_id
                WHERE rt.is_archived = 1 AND (rtl.action = 'Archive' OR rtl.action IS NULL)
                GROUP BY rt.id
            ");
            while ($row = $stmt_types->fetch(PDO::FETCH_ASSOC)) {
                $all_archives[] = [
                    'date_archived' => $row['date_archived'] ?? 'N/A',
                    'category' => 'Request Type',
                    'details' => $row['name'],
                    'archived_by' => $row['archived_by'] ?? 'N/A',
                    'action_id' => 'type-' . $row['id']
                ];
            }
        }

        // 3. Fetch "Archived" Requests
        if ($category === 'All' || $category === 'Requests') {
            $stmt_requests = $pdo->query("
                SELECT r.id, r.ref_number, r.updated_at, c.full_name
                FROM requests r
                JOIN citizens c ON r.citizen_id = c.id
                WHERE r.status = 'released' OR r.status = 'cancelled'
            ");
            while ($row = $stmt_requests->fetch(PDO::FETCH_ASSOC)) {
                $all_archives[] = [
                    'date_archived' => $row['updated_at'],
                    'category' => 'Request',
                    'details' => $row['ref_number'] . ' (' . $row['full_name'] . ')',
                    'archived_by' => 'System',
                    'action_id' => 'request-' . $row['id']
                ];
            }
        }
        
        // 4. Fetch Archived Users
        if ($category === 'All' || $category === 'Users') {
            $stmt_users = $pdo->query("
                SELECT 
                    u.id, u.full_name, u.username, 
                    ual.timestamp AS date_archived,
                    ual.admin_user_name AS archived_by
                FROM users u
                LEFT JOIN user_action_logs ual ON u.id = ual.user_id
                WHERE u.is_active = 0 AND (ual.action = 'Disable' OR ual.action IS NULL)
                GROUP BY u.id
            ");
            while ($row = $stmt_users->fetch(PDO::FETCH_ASSOC)) {
                $all_archives[] = [
                    'date_archived' => $row['date_archived'] ?? 'N/A',
                    'category' => 'User',
                    'details' => $row['full_name'] . ' (@' . $row['username'] . ')',
                    'archived_by' => $row['archived_by'] ?? 'N/A',
                    'action_id' => 'user-' . $row['id']
                ];
            }
        }
        
        // 5. Sort all records by date
        usort($all_archives, function($a, $b) {
            if ($a['date_archived'] == 'N/A') return 1;
            if ($b['date_archived'] == 'N/A') return -1;
            return strtotime($b['date_archived']) - strtotime($a['date_archived']);
        });

        http_response_code(200);
        echo json_encode($all_archives);

    } else if ($method === 'PUT') {
        // --- This is your new "Restore" block ---
        
        $data = json_decode(file_get_contents("php://input"), true);
        $action_id = $data['id'] ?? null;
        
        // Get admin info
        $admin_id = $data['admin_user_id'] ?? 0;
        $admin_name = $data['admin_user_name'] ?? 'System';

        if (!$action_id) {
            http_response_code(400);
            echo json_encode(['error' => 'Action ID is required.']);
            exit;
        }
        
        list($type, $id) = explode('-', $action_id);

        $sql = "";
        $log_details = "";
        
        if ($type === 'citizen') {
            // Get name for log
            $stmt_check = $pdo->prepare("SELECT full_name FROM citizens WHERE id = ?");
            $stmt_check->execute([$id]);
            $item_name = $stmt_check->fetchColumn();
            
            $sql = "UPDATE citizens SET is_active = 1 WHERE id = ?";
            
            // Log the Action
            $log_details = "Citizen '{$item_name}' was restored from archive.";
            log_citizen_action($pdo, $id, $admin_id, $admin_name, 'Restore', $log_details);
            
        } else if ($type === 'type') {
            // Get name for log
            $stmt_check = $pdo->prepare("SELECT name FROM request_types WHERE id = ?");
            $stmt_check->execute([$id]);
            $item_name = $stmt_check->fetchColumn();
            
            $sql = "UPDATE request_types SET is_archived = 0 WHERE id = ?";
            $log_details = "Request Type '{$item_name}' was restored from archive.";
            log_action($pdo, $id, $admin_id, $admin_name, 'Restore', $log_details);
            
        } else if ($type === 'user') {
            // Get name for log
            $stmt_check = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt_check->execute([$id]);
            $item_name = $stmt_check->fetchColumn();

            $sql = "UPDATE users SET is_active = 1 WHERE id = ?";
            $log_details = "User account '@{$item_name}' was restored from archive.";
            log_user_action($pdo, $id, $admin_id, $admin_name, 'Restore', $log_details);

        } else if ($type === 'request') {
            // Get name for log
            $stmt_check = $pdo->prepare("SELECT ref_number FROM requests WHERE id = ?");
            $stmt_check->execute([$id]);
            $item_name = $stmt_check->fetchColumn();

            $sql = "UPDATE requests SET status = 'on_queue' WHERE id = ? AND (status = 'cancelled' OR status = 'released')";
            // We don't have a general request log table, so this won't be saved to the audit trail
            
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid item type.']);
            exit;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);

        echo json_encode(['message' => 'Item restored successfully.']);
        // --- END REPLACED BLOCK ---

    } else if ($method === 'DELETE') {
        // ... (Your existing DELETE logic is unchanged) ...
        $action_id = $_GET['id'] ?? null;
        if (!$action_id) {
            http_response_code(400);
            echo json_encode(['error' => 'Action ID is required.']);
            exit;
        }
        
        list($type, $id) = explode('-', $action_id);

        $sql = "";
        if ($type === 'citizen') {
            $sql = "DELETE FROM citizens WHERE id = ?";
        } else if ($type === 'type') {
            $sql = "DELETE FROM request_types WHERE id = ?";
        } else if ($type === 'request') {
            $sql = "DELETE FROM requests WHERE id = ?";
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid item type.']);
            exit;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);

        echo json_encode(['message' => 'Item permanently deleted.']);

    } else {
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>