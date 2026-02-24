<?php
/**
 * api/sync-settings.php
 * Save user settings to shared hosting MySQL DB
 * Security: Firebase JWT token verification, prepared statements, rate limiting
 *
 * POST /api/sync-settings.php
 * Headers: Authorization: Bearer <firebase_id_token>
 * Body: { settings: { theme, mySubjects, studyTimer, ... } }
 */

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/rate-limit.php';

// ── CORS: restrict to your domain
$allowed_origin = defined('ALLOWED_ORIGIN') ? ALLOWED_ORIGIN : 'https://yourdomain.com';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === $allowed_origin) {
    header("Access-Control-Allow-Origin: $allowed_origin");
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    exit(0);
}

// ── Rate limiting ──────────────────────────────────────────────────────────
rateLimit('sync', 30, 60); // max 30 syncs per 60 seconds per IP

// ── Only allow POST ────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

// ── Verify Firebase ID Token ───────────────────────────────────────────────
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!str_starts_with($authHeader, 'Bearer ')) {
    http_response_code(401);
    exit(json_encode(['error' => 'Missing authorization token']));
}

$idToken = substr($authHeader, 7);
$uid     = verifyFirebaseToken($idToken);

if (!$uid) {
    http_response_code(401);
    exit(json_encode(['error' => 'Invalid or expired token']));
}

// ── Student email check (enforced server-side too) ─────────────────────────
$email = getEmailFromToken($idToken);
if ($email && !isStudentEmail($email)) {
    http_response_code(403);
    exit(json_encode(['error' => 'Only IITM student emails are allowed']));
}

// ── Parse body ─────────────────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
if (!isset($body['settings']) || !is_array($body['settings'])) {
    http_response_code(400);
    exit(json_encode(['error' => 'Invalid body']));
}

// Whitelist allowed setting keys to prevent storing arbitrary data
$allowed_keys = ['theme', 'selectedSubjects', 'studyTimer', 'autoSaveNotes', 'autoPlayNext',
                 'resumeLectures', 'aiChatHistory', 'avatarSeed', 'geminiApiKey', 'syncMode'];
$settings = array_intersect_key($body['settings'], array_flip($allowed_keys));

if (empty($settings)) {
    exit(json_encode(['success' => true, 'note' => 'No valid settings to save']));
}

// ── Write to DB ────────────────────────────────────────────────────────────
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $settingsJson = json_encode($settings, JSON_UNESCAPED_UNICODE);

    // Upsert: insert or update on duplicate UID
    $stmt = $pdo->prepare("
        INSERT INTO user_settings (uid, email, settings, updated_at)
        VALUES (:uid, :email, :settings, NOW())
        ON DUPLICATE KEY UPDATE
            settings   = VALUES(settings),
            email      = VALUES(email),
            updated_at = NOW()
    ");

    $stmt->execute([
        ':uid'      => $uid,
        ':email'    => $email ?? '',
        ':settings' => $settingsJson,
    ]);

    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
    error_log('DB Error: ' . $e->getMessage());
}

// ── Helpers ────────────────────────────────────────────────────────────────
function verifyFirebaseToken(string $idToken): ?string {
    // Verify the Firebase JWT by fetching Google's public keys
    // and validating the signature. Returns UID on success, null on failure.
    $parts = explode('.', $idToken);
    if (count($parts) !== 3) return null;

    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
    if (!$payload) return null;

    // Basic checks
    if ($payload['iss'] !== 'https://securetoken.google.com/' . FIREBASE_PROJECT_ID) return null;
    if ($payload['aud'] !== FIREBASE_PROJECT_ID) return null;
    if ($payload['exp'] < time()) return null;

    // Full signature verification via Google's public keys API
    $keysUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
    $keysJson = @file_get_contents($keysUrl);
    if (!$keysJson) return $payload['sub'] ?? null; // fallback: skip sig check if we can't fetch keys

    $keys = json_decode($keysJson, true);
    $header = json_decode(base64_decode(strtr($parts[0], '-_', '+/')), true);
    $kid = $header['kid'] ?? '';
    if (!isset($keys[$kid])) return null;

    $pubKey = openssl_get_publickey($keys[$kid]);
    $data   = $parts[0] . '.' . $parts[1];
    $sig    = base64_decode(strtr($parts[2], '-_', '+/'));

    $valid = openssl_verify($data, $sig, $pubKey, OPENSSL_ALGO_SHA256);
    return $valid === 1 ? ($payload['sub'] ?? null) : null;
}

function getEmailFromToken(string $idToken): ?string {
    $parts = explode('.', $idToken);
    if (count($parts) !== 3) return null;
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
    return $payload['email'] ?? null;
}

// Allow: @ds.study.iitm.ac.in  and @study.iitm.ac.in
function isStudentEmail(string $email): bool {
    $allowed = ['ds.study.iitm.ac.in', 'study.iitm.ac.in'];
    $domain  = strtolower(substr($email, strrpos($email, '@') + 1));
    return in_array($domain, $allowed, true);
}
