<?php
require 'db_connect.php';
header('Content-Type: application/json');

// This script only accepts GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get the citizen_id from the query (e.g., ?citizen_id=1)
$citizen_id = $_GET['citizen_id'] ?? null;

if (!$citizen_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Citizen ID is required.']);
    exit;
}

try {
    // Fetch all requests for this citizen, joining with request_types to get the name
    $sql = "
        SELECT 
            r.ref_number, 
            r.status, 
            r.requested_at, 
            t.name AS type_name
        FROM requests r
        JOIN request_types t ON r.type_id = t.id
        WHERE r.citizen_id = ?
        ORDER BY r.requested_at DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$citizen_id]);
    
    $logs = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode($logs);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>