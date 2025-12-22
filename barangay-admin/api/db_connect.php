<?php
// xampp/htdocs/barangay_api/api/db_connect.php

// Set headers for CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$host = '153.92.15.84';
$db   = 'u279021732_brgyugong'; // Your database name
$user = 'u279021732_brgyugong'; 
$pass = 'Ds#XH1I#t';     // Default XAMPP password (often blank)

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed. Ensure XAMPP is running."]);
    exit();
}
?>