<?php
require 'db_connect.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // This query joins all three tables to get the names
        $sql = "
            SELECT 
                r.id, r.ref_number, r.status, r.requested_at, r.updated_at,
                c.full_name AS citizen_name,
                t.name AS type_name
            FROM requests r
            JOIN citizens c ON r.citizen_id = c.id
            JOIN request_types t ON r.type_id = t.id
            ORDER BY r.requested_at DESC
        ";
        
        $stmt = $pdo->query($sql);
        $requests = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode($requests);

    } else {
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>