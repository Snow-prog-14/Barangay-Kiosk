<?php
require 'db_connect.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $id = $_GET['id'] ?? null; // Check for a single ID (for details)
        $status = $_GET['status'] ?? null; // NEW: Check for a status filter

        if ($id) {
            // --- Fetches a SINGLE request's details ---
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
            // --- Fetches ALL requests (now with filtering) ---
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

            // NEW: Add WHERE clause if status is provided
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
    
    // --- THIS EXTRA BRACE WAS REMOVED ---
    // } 
    // ---
    
    } else { // This 'else' now correctly matches the 'if ($method === 'GET')'
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>