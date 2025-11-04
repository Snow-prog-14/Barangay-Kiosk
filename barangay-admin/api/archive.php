<?php
require 'db_connect.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$category = $_GET['category'] ?? 'All'; 
$category = ucfirst(strtolower($category));

try {
    if ($method === 'GET') {
        $all_archives = [];

        // 1. Fetch Archived Citizens
        if ($category === 'All' || $category === 'Citizens') {
            $stmt_citizens = $pdo->query("SELECT id, full_name, registered_at FROM citizens WHERE is_active = 0");
            while ($row = $stmt_citizens->fetch(PDO::FETCH_ASSOC)) {
                $all_archives[] = [
                    'date_archived' => $row['registered_at'],
                    'category' => 'Citizen',
                    'details' => $row['full_name'],
                    'archived_by' => 'N/A',
                    'action_id' => 'citizen-' . $row['id']
                ];
            }
        }

        // 2. Fetch Archived Request Types
        if ($category === 'All' || $category === 'Types' || $category === 'Request type') {
            $stmt_types = $pdo->query("
                SELECT rt.id, rt.name, rtl.timestamp AS date_archived, rtl.user_name AS archived_by
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
        
        // 4. Sort all records by date
        usort($all_archives, function($a, $b) {
            if ($a['date_archived'] == 'N/A') return 1;
            if ($b['date_archived'] == 'N/A') return -1;
            return strtotime($b['date_archived']) - strtotime($a['date_archived']);
        });

        http_response_code(200);
        echo json_encode($all_archives);

    } else if ($method === 'PUT') {
        // --- NEW: RESTORE an item ---
        
        $data = json_decode(file_get_contents("php://input"), true);
        $action_id = $data['id'] ?? null;

        if (!$action_id) {
            http_response_code(400);
            echo json_encode(['error' => 'Action ID is required.']);
            exit;
        }
        
        list($type, $id) = explode('-', $action_id);

        $sql = "";
        if ($type === 'citizen') {
            // Un-archive a citizen
            $sql = "UPDATE citizens SET is_active = 1 WHERE id = ?";
        } else if ($type === 'type') {
            // Un-archive a request type
            $sql = "UPDATE request_types SET is_archived = 0 WHERE id = ?";
        } else if ($type === 'request') {
            // Restore a 'cancelled' request back to 'on_queue'
            // We don't restore 'released' requests.
            $sql = "UPDATE requests SET status = 'on_queue' WHERE id = ? AND status = 'cancelled'";
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid item type.']);
            exit;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);

        echo json_encode(['message' => 'Item restored successfully.']);

    } else if ($method === 'DELETE') {
        // --- This is your existing Permanent Delete logic ---
        
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