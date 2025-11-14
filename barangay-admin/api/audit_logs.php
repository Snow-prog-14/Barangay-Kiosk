<?php
require 'db_connect.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $search_query = $_GET['q'] ?? '';
        $filter_action = $_GET['action'] ?? 'all'; 

        $all_logs = [];
        $allowed_actions = ['Create', 'Edit', 'Archive', 'Restore', 'Disable']; // Added 'Disable'

        // --- 1. Fetch Login Logs ---
        if ($filter_action === 'all' || $filter_action === 'Login') {
            $sql_login = "SELECT login_time AS date, username AS user, 'Login' AS action, CONCAT('Logged in to the system. User ID: ', user_id) AS details FROM login_logs";
            $params_login = [];
            if ($search_query) {
                $sql_login .= " WHERE username LIKE ?";
                $params_login[] = "%$search_query%";
            }
            $stmt_login = $pdo->prepare($sql_login);
            $stmt_login->execute($params_login);
            $all_logs = array_merge($all_logs, $stmt_login->fetchAll(PDO::FETCH_ASSOC));
        }

        // --- 2. Fetch Request Type Logs ---
        if ($filter_action === 'all' || in_array($filter_action, $allowed_actions)) {
            $sql_types = "SELECT timestamp AS date, user_name AS user, action, details FROM request_type_logs";
            $params_types = [];
            $where_clauses = [];

            if ($search_query) {
                $where_clauses[] = "(user_name LIKE ? OR action LIKE ? OR details LIKE ?)";
                $params_types[] = "%$search_query%"; $params_types[] = "%$search_query%"; $params_types[] = "%$search_query%";
            }
            if ($filter_action !== 'all') {
                $where_clauses[] = "action = ?";
                $params_types[] = $filter_action;
            }
            if (count($where_clauses) > 0) $sql_types .= " WHERE " . implode(' AND ', $where_clauses);
            
            $stmt_types = $pdo->prepare($sql_types);
            $stmt_types->execute($params_types);
            $all_logs = array_merge($all_logs, $stmt_types->fetchAll(PDO::FETCH_ASSOC));
        }

        // --- 3. Fetch User Action Logs ---
        if ($filter_action === 'all' || in_array($filter_action, $allowed_actions)) {
            $sql_users = "SELECT timestamp AS date, admin_user_name AS user, action, details FROM user_action_logs";
            $params_users = [];
            $where_clauses_users = [];

            if ($search_query) {
                $where_clauses_users[] = "(admin_user_name LIKE ? OR action LIKE ? OR details LIKE ?)";
                $params_users[] = "%$search_query%"; $params_users[] = "%$search_query%"; $params_users[] = "%$search_query%";
            }
            if ($filter_action !== 'all') {
                $where_clauses_users[] = "action = ?";
                $params_users[] = $filter_action;
            }
            if (count($where_clauses_users) > 0) $sql_users .= " WHERE " . implode(' AND ', $where_clauses_users);

            $stmt_users = $pdo->prepare($sql_users);
            $stmt_users->execute($params_users);
            $all_logs = array_merge($all_logs, $stmt_users->fetchAll(PDO::FETCH_ASSOC));
        }
        
        // --- 4. NEW: Fetch Citizen Action Logs ---
        if ($filter_action === 'all' || in_array($filter_action, $allowed_actions)) {
            $sql_citizens = "SELECT timestamp AS date, admin_user_name AS user, action, details FROM citizen_action_logs";
            $params_citizens = [];
            $where_clauses_citizens = [];

            if ($search_query) {
                $where_clauses_citizens[] = "(admin_user_name LIKE ? OR action LIKE ? OR details LIKE ?)";
                $params_citizens[] = "%$search_query%"; $params_citizens[] = "%$search_query%"; $params_citizens[] = "%$search_query%";
            }
            if ($filter_action !== 'all') {
                $where_clauses_citizens[] = "action = ?";
                $params_citizens[] = $filter_action;
            }
            if (count($where_clauses_citizens) > 0) $sql_citizens .= " WHERE " . implode(' AND ', $where_clauses_citizens);

            $stmt_citizens = $pdo->prepare($sql_citizens);
            $stmt_citizens->execute($params_citizens);
            $all_logs = array_merge($all_logs, $stmt_citizens->fetchAll(PDO::FETCH_ASSOC));
        }
        // --- END NEW ---
        
        // --- Sort all logs ---
        usort($all_logs, function($a, $b) {
            return strtotime($b['date']) - strtotime($a['date']);
        });
        
        echo json_encode($all_logs);

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>