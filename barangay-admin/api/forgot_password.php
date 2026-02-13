<?php
date_default_timezone_set('Asia/Manila');
// --- 1. Load PHPMailer (EXACT SAME AS users.php) ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// IMPORTANT: same relative path as users.php
require '../../vendor/autoload.php';
// --- End Load ---

require 'db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$email = trim($_POST['email'] ?? '');

// Always redirect back (security)
$redirect = "../pages/forgot-password.html?sent=1";

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header("Location: $redirect");
    exit;
}

/* 1️⃣ Check if user exists */
$stmt = $pdo->prepare(
    "SELECT id, full_name 
     FROM users 
     WHERE email = ? AND is_active = 1"
);
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    // Do not reveal if email exists
    header("Location: $redirect");
    exit;
}

/* 2️⃣ Generate reset token */
$token  = bin2hex(random_bytes(32));
$expiry = date("Y-m-d H:i:s", strtotime("+30 minutes"));

$stmt = $pdo->prepare(
    "UPDATE users 
     SET reset_token = ?, 
         reset_token_expiry = ?, 
         must_change_password = 1
     WHERE id = ?"
);
$stmt->execute([$token, $expiry, $user['id']]);

/* 3️⃣ Send reset email */
$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = 'smtp.hostinger.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'notify@barangay-ugong.com';
    $mail->Password   = '=ZZDSy6]'; // App password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->setFrom('notify@barangay-ugong.com', 'Barangay Ugong Admin System');
    $mail->addAddress($email, $user['full_name']);

    $resetLink = "https://admin.barangay-ugong.com/barangay-admin/pages/force_change_password.html?token=$token";

    $mail->isHTML(true);
    $mail->Subject = 'Password Reset Request';
    $mail->Body = "
      <p>Hello {$user['full_name']},</p>

      <p>You requested to reset your password.</p>

      <p>
        <a href='{$resetLink}'
          style='display:inline-block;
                  padding:10px 15px;
                  background:#198754;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:4px;'>
          Reset Password
        </a>
      </p>

      <p>This link expires in 30 minutes.</p>

      <br>

      <div>
        <table cellpadding='0' cellspacing='0' border='0' style='border-collapse:collapse;'>
          <tr>
            <td style='vertical-align:top; padding-right:12px;'>
              <img
                src='https://admin.barangay-ugong.com/barangay-admin/styles/brgyUgong.png'
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
    // Silent fail for security, log internally
    error_log("Forgot password mail error: " . $mail->ErrorInfo);
}

// Always redirect back to UI
header("Location: $redirect");
exit;
