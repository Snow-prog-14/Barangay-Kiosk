<?php
require 'db_connect.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $id = $_GET['id'] ?? null; 
        $status = $_GET['status'] ?? null;

        if ($id) {
            // Fetches a SINGLE request's details
            $sql = "
                SELECT 
                    r.id, r.ref_number, r.status, r.requested_at, r.updated_at,
                    r.form_path,
                    c.full_name AS citizen_name,
                    t.name AS type_name
                FROM requests r
                JOIN citizens c ON r.citizen_id = c.id
                JOIN request_types t ON r.type_id = t.id
                WHERE r.id = ?
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            $request = $stmt->fetch();
            echo json_encode($request);

        } else {
            // Fetches ALL requests (with filtering)
            $params = [];
            $sql = "
                SELECT 
                    r.id, r.ref_number, r.status, r.requested_at, r.updated_at,
                    c.full_name AS citizen_name,
                    t.name AS type_name
                FROM requests r
                JOIN citizens c ON r.citizen_id = c.id
                JOIN request_types t ON r.type_id = t.id
            ";

            if ($status) {
                $sql .= " WHERE r.status = ?";
                $params[] = $status;
            }

            $sql .= " ORDER BY r.requested_at DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $requests = $stmt->fetchAll();
            echo json_encode($requests);
        }
    
    } else if ($method === 'PUT') {
        // --- NEW: Handle Status Updates ---
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;
        $new_status = $data['status'] ?? null;

        if (!$id || !$new_status) {
            http_response_code(400);
            echo json_encode(['error' => 'Request ID and new status are required.']);
            exit;
        }

        // Validate the status
        $allowed = ['on_queue', 'payment_pending', 'processing', 'ready_for_pick_up', 'released', 'completed', 'cancelled'];
        if (!in_array($new_status, $allowed)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status value.']);
            exit;
        }

        $sql = "UPDATE requests SET status = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$new_status, $id]);

        echo json_encode(['message' => 'Status updated successfully']);
        
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>