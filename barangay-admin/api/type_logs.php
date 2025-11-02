<?php
require 'db_connect.php';
header('Content-Type: application/json');

// This script only accepts GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get the request_type_id from the query parameter (e.g., ?type_id=1)
$request_type_id = $_GET['type_id'] ?? null;

if (!$request_type_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Request Type ID is required.']);
    exit;
}

try {
    // Fetch all logs for the specified type, newest first
    $sql = "
        SELECT user_name, action, details, timestamp 
        FROM request_type_logs 
        WHERE request_type_id = ? 
        ORDER BY timestamp DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$request_type_id]);
    
    $logs = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode($logs);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>