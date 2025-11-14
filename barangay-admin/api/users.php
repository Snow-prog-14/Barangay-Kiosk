<?php
// --- 1. Load PHPMailer ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Load Composer's autoloader
require '../../vendor/autoload.php'; // Corrected path
// --- End Load ---

require 'db_connect.php';
header('Content-Type: application/json');

/**
 * Helper function to create a user audit log entry.
 */
function log_user_action($pdo, $user_id, $admin_id, $admin_name, $action, $details) {
    try {
        $log_sql = "INSERT INTO user_action_logs (user_id, admin_user_id, admin_user_name, action, details) VALUES (?, ?, ?, ?, ?)";
        $log_stmt = $pdo->prepare($log_sql);
        $log_stmt->execute([$user_id, $admin_id, $admin_name, $action, $details]);
    } catch (PDOException $e) {
        // Silently fail or log to a file, but don't stop the main operation
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
        // --- GET (Fetch all or one) ---
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT id, full_name, username, email, role, is_active FROM users WHERE id = ?");
                $stmt->execute([$id]);
                $user = $stmt->fetch();
                echo json_encode($user);
            } else {
                $stmt = $pdo->query("SELECT id, full_name, username, email, role, is_active FROM users WHERE is_active = 1 ORDER BY id ASC");
                $users = $stmt->fetchAll();
                echo json_encode($users);
            }
            break;

        // --- POST (Add new user AND send email) ---
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Get admin info (for logging)
            $admin_id = $data['admin_user_id'] ?? 0;
            $admin_name = $data['admin_user_name'] ?? 'System';

            // Now checks for 'email'
            if (empty($data['full_name']) || empty($data['username']) || empty($data['email']) || empty($data['role'])) {
                http_response_code(400);
                echo json_encode(['error' => 'All fields (Full Name, Username, Email, Role) are required.']);
                exit;
            }

            // --- 1. Generate Temporary Password ---
            $temporary_password = bin2hex(random_bytes(4));
            $password_hash = password_hash($temporary_password, PASSWORD_DEFAULT);
            $is_active = $data['is_active'] ? 1 : 0;

            // --- 2. Send the Email via Gmail ---
            $mail = new PHPMailer(true);
            try {
                //Server settings
                $mail->isSMTP();
                $mail->Host       = 'smtp.gmail.com';
                $mail->SMTPAuth   = true;
                $mail->Username   = 'barangayugong.notify@gmail.com'; // Your Gmail address
                $mail->Password   = 'gvae eblu wxar bffm'; // Your App Password
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                $mail->Port       = 465;

                //Recipients
                // Using barangayugong.system@gmail.com as the 'From' address
                $mail->setFrom('barangayugong.system@gmail.com', 'Barangay Ugong Admin System');
                $mail->addAddress($data['email'], $data['full_name']); // Add the new user's email

                //Content
                $mail->isHTML(true);
                $mail->Subject = 'Your Barangay Admin Account Credentials';
                $mail->Body    = "
                    <p>Hello {$data['full_name']},</p>
                    <p>An account has been created for you for the Barangay Ugong Admin Portal.</p>
                    <p>Your login details are:</p>
                    <ul style='font-family: monospace; font-size: 1.1em;'>
                        <li>Username: <strong>{$data['username']}</strong></li>
                        <li>Temporary Password: <strong>{$temporary_password}</strong></li>
                    </ul>
                    <p>You will be required to change this password on your first login.</p>
                    <p>Thank you,</p>
                    <p><em>Barangay Admin System</em></p>
                ";

                $mail->send();
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => "User was NOT created. Email could not be sent. Mailer Error: {$mail->ErrorInfo}"]);
                exit;
            }
            // --- 3. Save to Database (Only after email sends) ---
            $sql = "INSERT INTO users (full_name, email, username, password_hash, role, is_active, must_change_password) VALUES (?, ?, ?, ?, ?, ?, 1)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['full_name'], $data['email'], $data['username'], $password_hash, $data['role'], $is_active]);
            $new_user_id = $pdo->lastInsertId();

            // --- 4. Log the Action ---
            $details = "Created user: {$data['full_name']} (@{$data['username']}). Role: {$data['role']}.";
            log_user_action($pdo, $new_user_id, $admin_id, $admin_name, 'Create', $details);
            // --- End Log ---

            http_response_code(201);
            echo json_encode(['message' => 'User created successfully and email sent.']);
            break;

        // --- PUT (Update existing user) ---
        case 'PUT':
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? null;

            // Get admin info (for logging)
            $admin_id = $data['admin_user_id'] ?? 0;
            $admin_name = $data['admin_user_name'] ?? 'System';

            if (!$id || empty($data['full_name']) || empty($data['username']) || empty($data['email']) || empty($data['role'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID, Full Name, Username, Email, and Role are required.']);
                exit;
            }

            // Get old data for comparison
            $stmt_check = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt_check->execute([$id]);
            $old_data = $stmt_check->fetch(PDO::FETCH_ASSOC);

            $sql = "UPDATE users SET full_name = ?, email = ?, username = ?, role = ?, is_active = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $is_active = $data['is_active'] ? 1 : 0;
            $stmt->execute([$data['full_name'], $data['email'], $data['username'], $data['role'], $is_active, $id]);

// --- Log the Action ---
            $details_log = [];
            if ($old_data['full_name'] != $data['full_name']) $details_log[] = "Name changed to '{$data['full_name']}'";
            if ($old_data['email'] != $data['email']) $details_log[] = "Email changed to '{$data['email']}'";
            if ($old_data['username'] != $data['username']) $details_log[] = "Username changed to '{$data['username']}'";
            if ($old_data['role'] != $data['role']) $details_log[] = "Role changed to '{$data['role']}'";
            if ($old_data['is_active'] != $is_active) $details_log[] = "Status changed to " . ($is_active ? 'Active' : 'Disabled');
            
            // --- THIS IS THE FIX ---
            $user_being_edited = $old_data['full_name'];
            if (empty($details_log)) {
                $details = "No changes made to user '{$user_being_edited}'.";
            } else {
                $details = "Edited user '{$user_being_edited}': " . implode('; ', $details_log);
            }
            // --- END FIX ---
            
            log_user_action($pdo, $id, $admin_id, $admin_name, 'Edit', $details);

            echo json_encode(['message' => 'User updated successfully']);
            break;

// --- DELETE (Deactivate user) ---
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID is required for delete.']);
                exit;
            }
            
            // Get user info from query string
            $admin_id = $_GET['admin_id'] ?? 0;
            $admin_name = $_GET['admin_name'] ?? 'System';

            // --- NEW: Get user's name for the log ---
            $stmt_check = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt_check->execute([$id]);
            $username = $stmt_check->fetchColumn();
            // --- END NEW ---

            $sql = "UPDATE users SET is_active = 0 WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);

            // --- Log the Action (Now with name) ---
            $details = "User account '{$username}' was disabled (archived).";
            log_user_action($pdo, $id, $admin_id, $admin_name, 'Disable', $details);
            // --- End Log ---

            echo json_encode(['message' => 'User deactivated successfully']);
            break;
        
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }

} catch (PDOException $e) {
    if ($e->errorInfo[1] == 1062) { // Duplicate username or email
        http_response_code(409);
        echo json_encode(['error' => 'This username or email is already taken.']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}
?>