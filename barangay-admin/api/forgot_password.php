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
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'saulfernandemil@gmail.com';
    $mail->Password   = 'stsl fazc avtd pbrt'; // App password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = 465;

    $mail->setFrom('saulfernandemil@gmail.com', 'Barangay Ugong Admin System');
    $mail->addAddress($email, $user['full_name']);

    $resetLink = "http://localhost/Barangay-Kiosk-main/barangay-admin/pages/force_change_password.html?token=$token";

    $mail->isHTML(true);
    $mail->Subject = 'Password Reset Request';
    $mail->Body = "
        <p>Hello {$user['full_name']},</p>
        <p>You requested to reset your password.</p>
        <p>
            <a href='$resetLink'
               style='display:inline-block;
                      padding:10px 15px;
                      background:#198754;
                      color:#fff;
                      text-decoration:none;
                      border-radius:4px;'>
               Reset Password
            </a>
        </p>
        <p>This link expires in 30 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
    ";

    $mail->send();

} catch (Exception $e) {
    // Silent fail for security, log internally
    error_log("Forgot password mail error: " . $mail->ErrorInfo);
}

// Always redirect back to UI
header("Location: $redirect");
exit;
