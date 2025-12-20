<?php
require 'db_connect.php';
header('Content-Type: application/json');

function log_action($pdo, $request_type_id, $user_id, $user_name, $action, $details) {
    try {
        $sql = "INSERT INTO request_type_logs 
                (request_type_id, user_id, user_name, action, details) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$request_type_id, $user_id, $user_name, $action, $details]);
    } catch (PDOException $e) {
        // silent fail
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {

        // =========================
        // GET
        // =========================
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("
                    SELECT id, name, form_template, is_active 
                    FROM request_types 
                    WHERE id = ?
                ");
                $stmt->execute([$id]);
                echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
            } else {
                $stmt = $pdo->query("
                    SELECT id, name, form_template, is_active
                    FROM request_types
                    WHERE is_archived = 0
                    ORDER BY id ASC
                ");
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            }
            break;

        // =========================
        // POST (ADD)
        // =========================
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);

            $user_id   = $data['user_id'] ?? 0;
            $user_name = $data['user_name'] ?? 'System';

            if (empty($data['name']) || empty($data['form_template'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Name and Form Template are required.']);
                exit;
            }

            $is_active = !empty($data['is_active']) ? 1 : 0;

            $stmt = $pdo->prepare("
                INSERT INTO request_types (name, form_template, is_active)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$data['name'], $data['form_template'], $is_active]);
            $new_id = $pdo->lastInsertId();

            $details = "Created type '{$data['name']}' | Form: {$data['form_template']} | Active: " .
                       ($is_active ? 'Yes' : 'No');

            log_action($pdo, $new_id, $user_id, $user_name, 'Create', $details);

            echo json_encode([
                'id' => $new_id,
                'name' => $data['name'],
                'form_template' => $data['form_template'],
                'is_active' => $is_active
            ]);
            break;

        // =========================
        // PUT (EDIT)
        // =========================
        case 'PUT':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;

            if (!$id || empty($data['name']) || empty($data['form_template'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID, Name, and Form Template are required.']);
                exit;
            }

            $user_id   = $data['user_id'] ?? 0;
            $user_name = $data['user_name'] ?? 'System';
            $is_active_new = !empty($data['is_active']) ? 1 : 0;

            $stmt = $pdo->prepare("
                SELECT name, form_template, is_active 
                FROM request_types 
                WHERE id = ?
            ");
            $stmt->execute([$id]);
            $old = $stmt->fetch(PDO::FETCH_ASSOC);

            $inactive_sql = "";
            if ($old['is_active'] == 1 && $is_active_new == 0) {
                $inactive_sql = ", inactive_since = NOW()";
            } elseif ($old['is_active'] == 0 && $is_active_new == 1) {
                $inactive_sql = ", inactive_since = NULL";
            }

            $stmt = $pdo->prepare("
                UPDATE request_types
                SET name = ?, form_template = ?, is_active = ? $inactive_sql
                WHERE id = ?
            ");
            $stmt->execute([
                $data['name'],
                $data['form_template'],
                $is_active_new,
                $id
            ]);

            $changes = [];
            if ($old['name'] !== $data['name']) {
                $changes[] = "Name: '{$old['name']}' → '{$data['name']}'";
            }
            if ($old['form_template'] !== $data['form_template']) {
                $changes[] = "Form: '{$old['form_template']}' → '{$data['form_template']}'";
            }
            if ($old['is_active'] != $is_active_new) {
                $changes[] = "Status changed";
            }

            $details = empty($changes)
                ? "No changes made to '{$old['name']}'"
                : implode(' | ', $changes);

            log_action($pdo, $id, $user_id, $user_name, 'Edit', $details);

            echo json_encode(['message' => 'Type updated successfully']);
            break;

        // =========================
        // DELETE (ARCHIVE)
        // =========================
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID is required.']);
                exit;
            }

            $user_id   = $_GET['user_id'] ?? 0;
            $user_name = $_GET['user_name'] ?? 'System';

            $stmt = $pdo->prepare("SELECT name FROM request_types WHERE id = ?");
            $stmt->execute([$id]);
            $name = $stmt->fetchColumn();

            $stmt = $pdo->prepare("
                UPDATE request_types 
                SET is_archived = 1 
                WHERE id = ?
            ");
            $stmt->execute([$id]);

            log_action($pdo, $id, $user_id, $user_name, 'Archive', "Archived '{$name}'");

            echo json_encode(['message' => 'Type archived']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
