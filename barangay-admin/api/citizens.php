<?php
require 'db_connect.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
        // --- GET (Fetch all or one) ---
        case 'GET':
            if ($id) {
                // Get single citizen by ID (for editing)
                $stmt = $pdo->prepare("SELECT id, full_name, address, contact_no FROM citizens WHERE id = ?");
                $stmt->execute([$id]);
                $citizen = $stmt->fetch();
                echo json_encode($citizen);
            } else {
                // Get all active citizens (This is your corrected line)
                $stmt = $pdo->query("SELECT id, full_name, address, contact_no FROM citizens WHERE is_active = TRUE ORDER BY id DESC");
                $citizens = $stmt->fetchAll();
                echo json_encode($citizens);
            }
            break;

        // --- POST (Add new citizen) ---
        // We are keeping this logic for now, but it won't be used
        // by the admin panel anymore.
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (empty($data['full_name'])) {
                http_response_code(400); 
                echo json_encode(['error' => 'Full Name is required.']);
                exit;
            }

            // Also set has_consented to true
            $sql = "INSERT INTO citizens (full_name, address, contact_no, has_consented) VALUES (?, ?, ?, 1)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['full_name'],
                $data['address'] ?? null, 
                $data['contact_no'] ?? null
            ]);

            $new_citizen_id = $pdo->lastInsertId();

            http_response_code(201); 
            echo json_encode([
                'id' => $new_citizen_id,
                'full_name' => $data['full_name'],
                'address' => $data['address'] ?? null,
                'contact_no' => $data['contact_no'] ?? null
            ]);
            break;

        // --- PUT (Update existing citizen) ---
        // This is the logic for the "Edit" button
        case 'PUT':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;

            if (!$id || empty($data['full_name'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID and Full Name are required for update.']);
                exit;
            }

            $sql = "UPDATE citizens SET full_name = ?, address = ?, contact_no = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['full_name'], 
                $data['address'] ?? null, 
                $data['contact_no'] ?? null, 
                $id
            ]);

            echo json_encode(['message' => 'Citizen updated successfully']);
            break;

        // --- DELETE (Deactivate citizen / Soft Delete) ---
        // This is the logic for the "Delete" (Archive) button
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID is required for deactivation.']);
                exit;
            }

            // Set is_active = 0 (Soft Delete)
            $sql = "UPDATE citizens SET is_active = 0 WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            echo json_encode(['message' => 'Citizen deactivated successfully']);
            break;
        
        default:
            http_response_code(405); 
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>