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
 * ✅ NEW: check if a column exists (prevents breaking if schema differs)
 */
function has_column($pdo, $table, $column) {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
        ");
        $stmt->execute([$table, $column]);
        return (int)$stmt->fetchColumn() > 0;
    } catch (PDOException $e) {
        return false;
    }
}

/**
 * ✅ NEW: normalize sections/fields to a safe string
 * NOTE: your DB values show like {basic} in phpMyAdmin, so we store as CSV: basic,construction
 */
function list_to_csv($value) {
    if ($value === null) return '';
    if (is_array($value)) {
        $clean = [];
        foreach ($value as $v) {
            $v = trim((string)$v);
            if ($v !== '') $clean[] = $v;
        }
        $clean = array_values(array_unique($clean));
        return implode(',', $clean);
    }
    if (is_string($value)) {
        $value = trim($value);
        if ($value === '') return '';
        // if it already looks like csv, keep it
        // if it looks like json-ish/array-ish, still try to normalize to csv
        $value = trim($value, "[]{}");
        $parts = explode(',', $value);
        $clean = [];
        foreach ($parts as $p) {
            $p = trim($p);
            $p = trim($p, "\"'");
            if ($p !== '') $clean[] = $p;
        }
        $clean = array_values(array_unique($clean));
        return implode(',', $clean);
    }
    return '';
}

/**
 * ✅ NEW: Execute statement, and if an "Unknown column" happens, retry after removing that column
 */
function exec_with_optional_cols($pdo, $sqlBuilderFn, $dataCols, $dataVals) {
    // $sqlBuilderFn($cols) returns [sql, orderedValues]
    // $dataCols are columns we WANT to include
    // We'll retry removing columns that trigger "Unknown column"
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

            // If DB says unknown column, remove it and retry
            // Example message contains: "Unknown column 'request_sections'"
            if (preg_match("/Unknown column '([^']+)'/i", $msg, $m)) {
                $badCol = $m[1];
                $idx = array_search($badCol, $cols, true);
                if ($idx !== false) {
                    array_splice($cols, $idx, 1);
                    array_splice($vals, $idx, 1);
                    continue;
                }
            }

            // Otherwise rethrow
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
            // ✅ IMPORTANT: include request_sections + required_fields so edit modal can restore checkboxes
            // Use COALESCE(is_archived,0) so NULL archive doesn't hide rows
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

        // Build column list (we TRY to include sections/fields ALWAYS)
        $columns = ["name", "slug", "is_active"];
        $values  = [$data['name'], $slug, $is_active];

        // If this column exists, make sure new rows are not hidden
        $columns[] = "is_archived";
        $values[] = 0;

        // If your table has these, save them. If not, our retry removes them automatically.
        $columns[] = "form_template";
        $values[]  = $data['form_template'] ?? null;

        $columns[] = "required_fields";
        $values[]  = list_to_csv($data['required_fields'] ?? []);

        $columns[] = "request_sections";
        $values[]  = list_to_csv($data['request_sections'] ?? []);

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

        // We will build SET dynamically with optional columns,
        // but ALWAYS try to include form_template/required_fields/request_sections.
        $sets = ["name = ?", "slug = ?", "is_active = ?"];
        $vals = [$data['name'], $slug, $is_active];

        $optCols = [];
        $optVals = [];

        $optCols[] = "form_template";
        $optVals[] = $data['form_template'] ?? null;

        $optCols[] = "required_fields";
        $optVals[] = list_to_csv($data['required_fields'] ?? []);

        $optCols[] = "request_sections";
        $optVals[] = list_to_csv($data['request_sections'] ?? []);

        $builder = function($cols, $valsIn) use ($sets, $vals, $data) {
            // $cols are optional columns we want to include as "col = ?"
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
    echo json_encode(['error' => 'Server error']);
}
