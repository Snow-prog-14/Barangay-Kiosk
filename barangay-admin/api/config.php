<?php
// Adjust credentials to your XAMPP setup
$DB_HOST = '153.92.15.84';
$DB_NAME = 'u279021732_brgyugong';
$DB_USER = 'u279021732_brgyugong';
$DB_PASS = 'Ds#XH1I#t'; // default XAMPP root has empty password

$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";

$options = [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  PDO::ATTR_EMULATE_PREPARES => false,
];

try {
  $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (Throwable $e) {
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'DB connection failed']);
  exit;
}

function json_out($data, $code = 200){
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
