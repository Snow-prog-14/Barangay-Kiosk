<?php
require 'db_connect.php';
header('Content-Type: application/json');

try {
    // Count all requests that have not been viewed yet
    $stmt = $pdo->query("SELECT COUNT(*) FROM requests WHERE is_viewed = FALSE");
    $new_request_count = $stmt->fetchColumn();

    http_response_code(200);
    echo json_encode(['new_requests' => (int)$new_request_count]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
?>