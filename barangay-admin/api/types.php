<?php
require_once "db_connect.php";
header("Content-Type: application/json");

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

// =========================
// Helpers
// =========================
function log_action($pdo, $request_type_id, $user_id, $user_name, $action, $details) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO request_type_logs
            (request_type_id, user_id, user_name, action, details)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$request_type_id, $user_id, $user_name, $action, $details]);
    } catch (PDOException $e) {}
}

function make_slug($text) {
    $text = strtolower($text);
    $text = preg_replace('/[^a-z0-9\s-]/', '', $text);
    $text = preg_replace('/\s+/', '-', $text);
    return trim($text, '-');
}

try {

    // =========================
    // GET
    // =========================
    if ($method === 'GET') {

        if ($id) {
            $stmt = $pdo->prepare("
                SELECT id, name, slug, form_template, is_active
                FROM request_types
                WHERE id = ? AND is_archived = 0
            ");
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
            exit;
        }

        $stmt = $pdo->query("
            SELECT id, name, is_active
            FROM request_types
            WHERE is_archived = 0
            ORDER BY id ASC
        ");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }

    // Read JSON body once
    $data = json_decode(file_get_contents("php://input"), true);

    // =========================
    // POST (ADD)
    // =========================
    if ($method === 'POST') {

        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Name is required']);
            exit;
        }

        $slug = make_slug($data['name']);
        $is_active = !empty($data['is_active']) ? 1 : 0;

        $stmt = $pdo->prepare("
            INSERT INTO request_types (name, slug, is_active)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$data['name'], $slug, $is_active]);

        $new_id = $pdo->lastInsertId();

        log_action(
            $pdo,
            $new_id,
            $data['user_id'] ?? 0,
            $data['user_name'] ?? 'System',
            'Create',
            "Created '{$data['name']}'"
        );

        echo json_encode(['id' => $new_id]);
        exit;
    }

    // =========================
    // PUT (EDIT)
    // =========================
    if ($method === 'PUT') {

        if (empty($data['id']) || empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID and Name are required']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT name FROM request_types WHERE id = ?");
        $stmt->execute([$data['id']]);
        $old_name = $stmt->fetchColumn();

        $slug = make_slug($data['name']);
        $is_active = !empty($data['is_active']) ? 1 : 0;

        $stmt = $pdo->prepare("
            UPDATE request_types
            SET name = ?, slug = ?, is_active = ?
            WHERE id = ?
        ");
        $stmt->execute([$data['name'], $slug, $is_active, $data['id']]);

        log_action(
            $pdo,
            $data['id'],
            $data['user_id'] ?? 0,
            $data['user_name'] ?? 'System',
            'Edit',
            "Updated '{$old_name}' → '{$data['name']}'"
        );

        echo json_encode(['message' => 'Updated']);
        exit;
    }

    // =========================
    // DELETE (ARCHIVE)
    // =========================
    if ($method === 'DELETE') {

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID is required']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT name FROM request_types WHERE id = ?");
        $stmt->execute([$id]);
        $name = $stmt->fetchColumn();

        $stmt = $pdo->prepare("
            UPDATE request_types
            SET is_archived = 1
            WHERE id = ?
        ");
        $stmt->execute([$id]);

        log_action(
            $pdo,
            $id,
            $_GET['user_id'] ?? 0,
            $_GET['user_name'] ?? 'System',
            'Archive',
            "Archived '{$name}'"
        );

        echo json_encode(['message' => 'Archived']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
