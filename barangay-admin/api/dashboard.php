<?php
require 'db_connect.php';
header('Content-Type: application/json');

// --- 1. Run Auto-Archive Logic ---
try {
    $archive_sql = "
        UPDATE request_types
        SET is_archived = 1
        WHERE is_active = 0 
          AND is_archived = 0
          AND inactive_since IS NOT NULL
          AND inactive_since <= NOW() - INTERVAL 7 DAY
    ";
    $pdo->query($archive_sql);
} catch (PDOException $e) {
    // Silently continue if this fails
}

// --- 2. Fetch All Dashboard Data ---
try {
    $data = [];

    // --- A. KPI Counts ---
    $stmt_citizens = $pdo->query("SELECT COUNT(*) FROM citizens WHERE is_active = TRUE");
    $data['kpis']['total_citizens'] = $stmt_citizens->fetchColumn();

    $stmt_requests = $pdo->query("SELECT COUNT(*) FROM requests");
    $data['kpis']['total_requests'] = $stmt_requests->fetchColumn();

    $stmt_processing = $pdo->query("SELECT COUNT(*) FROM requests WHERE status = 'processing'");
    $data['kpis']['total_processing'] = $stmt_processing->fetchColumn();

    $stmt_released = $pdo->query("SELECT COUNT(*) FROM requests WHERE status = 'released'");
    $data['kpis']['total_released'] = $stmt_released->fetchColumn();

    // --- B. Monthly Requests (for Bar Chart) ---
    // This query groups requests by month for the current year.
    $stmt_monthly = $pdo->query("
        SELECT 
            MONTH(requested_at) AS month,
            COUNT(*) AS count
        FROM requests
        WHERE YEAR(requested_at) = YEAR(CURDATE())
        GROUP BY MONTH(requested_at)
        ORDER BY month ASC
    ");
    $data['monthly_requests'] = $stmt_monthly->fetchAll();

    // --- C. Recent Requests (for Table) ---
    $stmt_recent = $pdo->query("
        SELECT 
            r.ref_number, r.status, r.updated_at,
            c.full_name AS citizen_name,
            t.name AS type_name
        FROM requests r
        JOIN citizens c ON r.citizen_id = c.id
        JOIN request_types t ON r.type_id = t.id
        ORDER BY r.requested_at DESC
        LIMIT 5
    ");
    $data['recent_requests'] = $stmt_recent->fetchAll();

    // --- D. Completion Trend (for Line Chart) ---
    // This query gets the count of 'released' requests per month
    $stmt_trend = $pdo->query("
        SELECT 
            MONTH(updated_at) AS month,
            COUNT(*) AS count
        FROM requests
        WHERE 
            YEAR(updated_at) = YEAR(CURDATE()) AND status = 'released'
        GROUP BY MONTH(updated_at)
        ORDER BY month ASC
    ");
    $data['completion_trend'] = $stmt_trend->fetchAll();


    // --- 3. Return All Data ---
    http_response_code(200);
    echo json_encode($data);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>