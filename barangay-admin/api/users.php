<?php
// --- 1. Load PHPMailer ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Load Composer's autoloader
require '../../vendor/autoload.php';
// --- End Load ---

require 'db_connect.php';
header('Content-Type: application/json');

/**
 * Helper function to create a user audit log entry.
 */
function log_user_action($pdo, $user_id, $admin_id, $admin_name, $action, $details) {
    try {
        $log_sql = "INSERT INTO user_action_logs 
            (user_id, admin_user_id, admin_user_name, action, details) 
            VALUES (?, ?, ?, ?, ?)";
        $log_stmt = $pdo->prepare($log_sql);
        $log_stmt->execute([$user_id, $admin_id, $admin_name, $action, $details]);
    } catch (PDOException $e) {
        // Silent fail (do not break main flow)
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {

        /* ---------------- GET ---------------- */
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare(
                    "SELECT id, full_name, username, email, role, is_active 
                     FROM users WHERE id = ?"
                );
                $stmt->execute([$id]);
                echo json_encode($stmt->fetch());
            } else {
                $stmt = $pdo->query(
                    "SELECT id, full_name, username, email, role, is_active 
                     FROM users 
                     WHERE is_active = 1 
                     ORDER BY id ASC"
                );
                echo json_encode($stmt->fetchAll());
            }
            break;

        /* ---------------- POST (ADD USER) ---------------- */
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);

            // Admin info for logs
            $admin_id   = $data['admin_user_id'] ?? 0;
            $admin_name = $data['admin_user_name'] ?? 'System';

            // Required fields
            if (
                empty($data['full_name']) ||
                empty($data['username']) ||
                empty($data['email']) ||
                empty($data['role'])
            ) {
                http_response_code(400);
                echo json_encode(['error' => 'All fields (Full Name, Username, Email, Role) are required.']);
                exit;
            }

            /* ===== CHECK EXISTING EMAIL / USERNAME (SAFE) ===== */
            $check = $pdo->prepare(
                "SELECT email, username 
                 FROM users 
                 WHERE email = ? OR username = ? 
                 LIMIT 1"
            );
            $check->execute([$data['email'], $data['username']]);
            $existing = $check->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                http_response_code(409);

                if (strcasecmp($existing['email'], $data['email']) === 0) {
                    echo json_encode(['error' => 'EMAIL_EXISTS']);
                } else {
                    echo json_encode(['error' => 'USERNAME_EXISTS']);
                }
                exit;
            }
            /* ===== END CHECK ===== */

            // Generate temporary password
            $temporary_password = bin2hex(random_bytes(4));
            $password_hash = password_hash($temporary_password, PASSWORD_DEFAULT);
            $is_active = !empty($data['is_active']) ? 1 : 0;

            // Send email
            $mail = new PHPMailer(true);
            try {
                $mail->isSMTP();
                $mail->Host       = 'smtp.gmail.com';
                $mail->SMTPAuth   = true;
                $mail->Username   = 'saulfernandemil@gmail.com';
                $mail->Password   = 'stsl fazc avtd pbrt';
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                $mail->Port       = 465;

                $mail->setFrom('saulfernandemil@gmail.com', 'Barangay Ugong Admin System');
                $mail->addAddress($data['email'], $data['full_name']);

                $mail->isHTML(true);
                $mail->Subject = 'Your Barangay Admin Account Credentials';
                $mail->Body = "
                    <p>Hello {$data['full_name']},</p>
                    <p>An account has been created for you.</p>
                    <ul style='font-family: monospace'>
                        <li>Username: <strong>{$data['username']}</strong></li>
                        <li>Temporary Password: <strong>{$temporary_password}</strong></li>
                    </ul>
                    <p>You will be required to change this password on first login.</p>
                ";

                $mail->send();
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Email could not be sent. User was not created.']);
                exit;
            }

            // Save user
            $stmt = $pdo->prepare(
                "INSERT INTO users 
                (full_name, email, username, password_hash, role, is_active, must_change_password)
                VALUES (?, ?, ?, ?, ?, ?, 1)"
            );
            $stmt->execute([
                $data['full_name'],
                $data['email'],
                $data['username'],
                $password_hash,
                $data['role'],
                $is_active
            ]);

            $new_user_id = $pdo->lastInsertId();

            // Log action
            log_user_action(
                $pdo,
                $new_user_id,
                $admin_id,
                $admin_name,
                'Create',
                "Created user: {$data['full_name']} (@{$data['username']})"
            );

            http_response_code(201);
            echo json_encode(['message' => 'User created successfully and email sent.']);
            break;

        /* ---------------- PUT ---------------- */
        case 'PUT':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;

            if (
                !$id ||
                empty($data['full_name']) ||
                empty($data['username']) ||
                empty($data['email']) ||
                empty($data['role'])
            ) {
                http_response_code(400);
                echo json_encode(['error' => 'ID, Full Name, Username, Email, and Role are required.']);
                exit;
            }

            $stmt = $pdo->prepare(
                "UPDATE users 
                 SET full_name = ?, email = ?, username = ?, role = ?, is_active = ? 
                 WHERE id = ?"
            );
            $stmt->execute([
                $data['full_name'],
                $data['email'],
                $data['username'],
                $data['role'],
                !empty($data['is_active']) ? 1 : 0,
                $id
            ]);

            echo json_encode(['message' => 'User updated successfully']);
            break;

        /* ---------------- DELETE ---------------- */
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID is required']);
                exit;
            }

            $stmt = $pdo->prepare("UPDATE users SET is_active = 0 WHERE id = ?");
            $stmt->execute([$id]);

            echo json_encode(['message' => 'User deactivated successfully']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
