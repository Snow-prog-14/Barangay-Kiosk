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

// ---- CORS (needed for PUT/DELETE from browser) ----
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-HTTP-Method-Override');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
// ---- END CORS ----

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

/**
 * NEW ROLES: staff, office_admin, app_admin
 * - Normalizes old role values (Admin/Staff/Kiosk) for backward compatibility.
 * - Validates allowed roles.
 */
function normalize_role_value($role) {
    if ($role === null) return null;

    $r = strtolower(trim((string)$role));

    // Backward compatibility (old values -> new enum values)
    if ($r === 'admin') return 'app_admin';
    if ($r === 'staff') return 'staff';
    if ($r === 'kiosk') return 'office_admin';

    // New values
    if ($r === 'staff') return 'staff';
    if ($r === 'office_admin') return 'office_admin';
    if ($r === 'app_admin') return 'app_admin';

    return null;
}

function is_allowed_role($role) {
    $allowed = ['staff', 'office_admin', 'app_admin'];
    return in_array($role, $allowed, true);
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

        /* ---------------- POST (ADD USER OR UPDATE USER) ---------------- */
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

            // Normalize + validate role (CHANGED FOR NEW ROLES)
            $normalized_role = normalize_role_value($data['role']);
            if ($normalized_role === null || !is_allowed_role($normalized_role)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid role.']);
                exit;
            }
            $data['role'] = $normalized_role;

            // If an ID is present in POST body, treat as UPDATE (fixes edit being treated as create)
            $action = $data['action'] ?? null;
            $has_id = isset($data['id']) && $data['id'] !== null && $data['id'] !== '';

            if ($action === 'update' || ($has_id && $action !== 'create')) {
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

                /* ===== CHECK EXISTING EMAIL / USERNAME (EXCLUDING THIS USER) ===== */
                $check = $pdo->prepare(
                    "SELECT id, email, username
                     FROM users
                     WHERE (email = ? OR username = ?)
                     AND id <> ?
                     LIMIT 1"
                );
                $check->execute([$data['email'], $data['username'], $id]);
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

            // Normalize role value
            $raw = strtolower(trim($data['role']));

            $roleMap = [
                'staff' => 'Staff',
                'office admin' => 'Office Admin',
                'application admin' => 'Application Admin',
                'admin' => 'Application Admin'
            ];

            $data['role'] = $roleMap[$raw] ?? 'Staff';


            // Generate temporary password
            $temporary_password = bin2hex(random_bytes(4));
            $password_hash = password_hash($temporary_password, PASSWORD_DEFAULT);
            $is_active = !empty($data['is_active']) ? 1 : 0;

            // Send email
            $mail = new PHPMailer(true);
            try {
                $mail->isSMTP();
                $mail->Host       = 'smtp.hostinger.com';
                $mail->SMTPAuth   = true;
                $mail->Username   = 'notify@barangay-ugong.com';
                $mail->Password   = '=ZZDSy6]';
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                $mail->Port       = 587;

                $mail->setFrom('notify@barangay-ugong.com', 'Barangay Ugong Admin System');
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

                <br>

                <div>
                  <table cellpadding='0' cellspacing='0' border='0' style='border-collapse:collapse;'>
                    <tr>
                      <td style='vertical-align:top; padding-right:12px;'>
                        <img
                          src='https://andra-admin.barangay-ugong.com/barangay-admin/styles/brgyUgong.png'
                          alt='Barangay Ugong'
                          style='max-width:160px; height:auto; display:block;'
                        >
                      </td>

                      <td style='vertical-align:top;'>
                        <p style='margin:0 0 6px 0; font-size:9pt; color:#ff9900;'>
                          This is an automated message. Please do not reply to this email.
                        </p>

                        <p style='margin:0 0 6px 0; font-size:9pt; color:#ff9900;'>
                          If you are not the intended recipient, please be advised that this message and any attachments may contain confidential, proprietary, or legally privileged information. Any review, use, disclosure, distribution, or copying of this communication is strictly prohibited.
                        </p>

                        <p style='margin:0 0 6px 0; font-size:9pt; color:#ff9900;'>
                          If you have received this email in error, please notify the sender immediately and permanently delete the message from your system.
                        </p>

                        <p style='margin:0; font-size:9pt; color:#ff9900;'>
                          Thank you for your cooperation.
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>
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

            // Normalize + validate role (CHANGED FOR NEW ROLES)
            $normalized_role = normalize_role_value($data['role']);
            if ($normalized_role === null || !is_allowed_role($normalized_role)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid role.']);
                exit;
            }
            $data['role'] = $normalized_role;

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
