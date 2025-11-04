<?php
require 'db_connect.php'; // Make sure this path is correct
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $search_query = $_GET['q'] ?? '';
        $filter_action = $_GET['action'] ?? '';
        $params = [];

        // Fetch Login Logs
        $sql_login = "
            SELECT 
                login_time AS date,
                username AS user,
                'Login' AS action,
                CONCAT('Logged in to the system. User ID: ', user_id) AS details
            FROM login_logs
            WHERE 1=1
        ";
        if ($search_query) {
            $sql_login .= " AND (username LIKE ? OR CONCAT('Logged in to the system. User ID: ', user_id) LIKE ?)";
            $params[] = "%$search_query%";
            $params[] = "%$search_query%";
        }
        if ($filter_action && $filter_action !== 'All Actions' && $filter_action !== 'Login') {
            $sql_login .= " AND 'Login' = '{$filter_action}'"; // This will effectively filter out Login if action doesn't match
        } else if ($filter_action === 'Login') {
            // Only show login logs
        } else {
            // Show all actions if not specifically filtering for 'Login'
        }
        $stmt_login = $pdo->prepare($sql_login);
        $stmt_login->execute($params);
        $login_logs = $stmt_login->fetchAll();
        
        // Clear params for the next query
        $params = [];

        // Fetch Request Type Logs
        $sql_request_type = "
            SELECT 
                timestamp AS date,
                user_name AS user,
                action,
                details
            FROM request_type_logs
            WHERE 1=1
        ";
        if ($search_query) {
            $sql_request_type .= " AND (user_name LIKE ? OR action LIKE ? OR details LIKE ?)";
            $params[] = "%$search_query%";
            $params[] = "%$search_query%";
            $params[] = "%$search_query%";
        }
        if ($filter_action && $filter_action !== 'All Actions' && $filter_action === 'Login') {
             $sql_request_type .= " AND action = 'Login'"; // This will effectively filter out other actions if filtering for 'Login'
        } else if ($filter_action && $filter_action !== 'All Actions') {
            $sql_request_type .= " AND action = ?";
            $params[] = $filter_action;
        }

        $stmt_request_type = $pdo->prepare($sql_request_type);
        $stmt_request_type->execute($params);
        $request_type_logs = $stmt_request_type->fetchAll();

        // Combine and sort
        $all_logs = array_merge($login_logs, $request_type_logs);

        // Custom sort function to sort by 'date' in descending order
        usort($all_logs, function($a, $b) {
            return strtotime($b['date']) - strtotime($a['date']);
        });
        
        echo json_encode($all_logs);

    } else {
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>