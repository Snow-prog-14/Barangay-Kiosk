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

/**
 * ✅ normalize form_template so it never becomes NULL
 */
function normalize_form_template($value) {
    if ($value === null) return 0;
    if (is_string($value)) {
        $v = trim($value);
        if ($v === '') return 0;
        return $v; // keep "Custom" or any valid string
    }
    return $value;
}

/**
 * ✅ IMPORTANT FIX:
 * Your DB constraint expects JSON array text like ["basic","construction"] or NULL.
 * This converts array / json-string / csv-string -> JSON array string.
 */
function list_to_json_array($value) {
    if ($value === null) return null;

    // If already an array
    if (is_array($value)) {
        $clean = [];
        foreach ($value as $v) {
            $v = trim((string)$v);
            if ($v !== '') $clean[] = $v;
        }
        $clean = array_values(array_unique($clean));
        if (!count($clean)) return null;
        return json_encode($clean);
    }

    // If string: could be JSON array already, or CSV
    if (is_string($value)) {
        $raw = trim($value);
        if ($raw === '') return null;

        // Try decode as JSON
        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            // normalize decoded
            $clean = [];
            foreach ($decoded as $v) {
                $v = trim((string)$v);
                if ($v !== '') $clean[] = $v;
            }
            $clean = array_values(array_unique($clean));
            if (!count($clean)) return null;
            return json_encode($clean);
        }

        // Otherwise treat as CSV-ish
        $raw = trim($raw, "[]{}");
        $parts = explode(',', $raw);
        $clean = [];
        foreach ($parts as $p) {
            $p = trim($p);
            $p = trim($p, "\"'");
            if ($p !== '') $clean[] = $p;
        }
        $clean = array_values(array_unique($clean));
        if (!count($clean)) return null;
        return json_encode($clean);
    }

    return null;
}

/**
 * ✅ Execute statement, and if an "Unknown column" happens, retry after removing that column
 */
function exec_with_optional_cols($pdo, $sqlBuilderFn, $dataCols, $dataVals) {
    $cols = $dataCols;
    $vals = $dataVals;

    while (true) {
        [$sql, $orderedVals] = $sqlBuilderFn($cols, $vals);
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($orderedVals);
            return true;
        } catch (PDOException $e) {
            $msg = $e->getMessage();

            if (preg_match("/Unknown column '([^']+)'/i", $msg, $m)) {
                $badCol = $m[1];
                $idx = array_search($badCol, $cols, true);
                if ($idx !== false) {
                    array_splice($cols, $idx, 1);
                    array_splice($vals, $idx, 1);
                    continue;
                }
            }

            throw $e;
        }
    }
}

try {

    // =========================
    // GET
    // =========================
    if ($method === 'GET') {

        if ($id) {
            $stmt = $pdo->prepare("
                SELECT id, name, slug, form_template, required_fields, request_sections, is_active
                FROM request_types
                WHERE id = ? AND COALESCE(is_archived, 0) = 0
            ");
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
            exit;
        }

        $stmt = $pdo->query("
            SELECT id, name, is_active
            FROM request_types
            WHERE COALESCE(is_archived, 0) = 0
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

        $columns = ["name", "slug", "is_active"];
        $values  = [$data['name'], $slug, $is_active];

        $columns[] = "is_archived";
        $values[] = 0;

        // ✅ never NULL
        $columns[] = "form_template";
        $values[]  = normalize_form_template($data['form_template'] ?? null);

        // ✅ store JSON array or NULL (matches your DB constraint)
        $columns[] = "required_fields";
        $values[]  = list_to_json_array($data['required_fields'] ?? null);

        // ✅ store JSON array or NULL (matches your DB constraint)
        $columns[] = "request_sections";
        $values[]  = list_to_json_array($data['request_sections'] ?? null);

        $builder = function($cols, $vals) {
            $placeholders = implode(", ", array_fill(0, count($cols), "?"));
            $colSql = implode(", ", $cols);
            $sql = "INSERT INTO request_types ($colSql) VALUES ($placeholders)";
            return [$sql, $vals];
        };

        exec_with_optional_cols($pdo, $builder, $columns, $values);

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

        $sets = ["name = ?", "slug = ?", "is_active = ?"];
        $vals = [$data['name'], $slug, $is_active];

        $optCols = [];
        $optVals = [];

        // ✅ never NULL
        $optCols[] = "form_template";
        $optVals[] = normalize_form_template($data['form_template'] ?? null);

        // ✅ JSON array or NULL
        $optCols[] = "required_fields";
        $optVals[] = list_to_json_array($data['required_fields'] ?? null);

        // ✅ JSON array or NULL
        $optCols[] = "request_sections";
        $optVals[] = list_to_json_array($data['request_sections'] ?? null);

        $builder = function($cols, $valsIn) use ($sets, $vals, $data) {
            $allSets = $sets;
            $allVals = $vals;

            for ($i = 0; $i < count($cols); $i++) {
                $allSets[] = $cols[$i] . " = ?";
                $allVals[] = $valsIn[$i];
            }

            $allVals[] = $data['id'];

            $sql = "UPDATE request_types SET " . implode(", ", $allSets) . " WHERE id = ?";
            return [$sql, $allVals];
        };

        exec_with_optional_cols($pdo, $builder, $optCols, $optVals);

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

    if (!empty($_GET['debug'])) {
        echo json_encode([
            'error' => $e->getMessage(),
            'code'  => $e->getCode()
        ]);
    } else {
        echo json_encode(['error' => 'Server error']);
    }
}