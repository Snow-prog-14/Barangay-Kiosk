<?php
require 'db_connect.php';
header('Content-Type: application/json');

// This script only accepts PUT requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Mark all unviewed requests as viewed
    $sql = "UPDATE requests SET is_viewed = 1 WHERE is_viewed = 0";
    $stmt = $pdo->query($sql);
    
    $affected_rows = $stmt->rowCount();

    http_response_code(200);
    echo json_encode(['message' => 'Notifications marked as read.', 'updated_count' => $affected_rows]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
?>