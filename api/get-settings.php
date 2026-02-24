<?php
/**
 * api/get-settings.php
 * Retrieve user settings from DB
 * GET /api/get-settings.php
 * Headers: Authorization: Bearer <firebase_id_token>
 */

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/rate-limit.php';

$allowed_origin = defined('ALLOWED_ORIGIN') ? ALLOWED_ORIGIN : 'https://yourdomain.com';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === $allowed_origin) {
    header("Access-Control-Allow-Origin: $allowed_origin");
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization');
    exit(0);
}

rateLimit('get', 60, 60);

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!str_starts_with($authHeader, 'Bearer ')) {
    http_response_code(401);
    exit(json_encode(['error' => 'Missing token']));
}

$idToken = substr($authHeader, 7);
$uid     = verifyFirebaseToken($idToken);
if (!$uid) {
    http_response_code(401);
    exit(json_encode(['error' => 'Invalid token']));
}

try {
    $pdo  = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS,
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $stmt = $pdo->prepare("SELECT settings, updated_at FROM user_settings WHERE uid = :uid LIMIT 1");
    $stmt->execute([':uid' => $uid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode(['settings' => null]);
    } else {
        echo json_encode([
            'settings'   => json_decode($row['settings'], true),
            'updated_at' => $row['updated_at'],
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
    error_log('DB Error: ' . $e->getMessage());
}

function verifyFirebaseToken(string $idToken): ?string {
    $parts = explode('.', $idToken);
    if (count($parts) !== 3) return null;
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
    if (!$payload) return null;
    if ($payload['iss'] !== 'https://securetoken.google.com/' . FIREBASE_PROJECT_ID) return null;
    if ($payload['aud'] !== FIREBASE_PROJECT_ID) return null;
    if ($payload['exp'] < time()) return null;
    return $payload['sub'] ?? null;
}
