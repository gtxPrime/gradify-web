<?php
/**
 * api/rate-limit.php – IP-based rate limiting via temporary files (No Session Bypass)
 */

function rateLimit(string $action, int $maxRequests, int $windowSeconds): void {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown_ip';
    if (strpos($ip, ',') !== false) {
        $ip = explode(',', $ip)[0]; // get the first IP if multiple
    }
    $ip = preg_replace('/[^a-zA-Z0-9.:]/', '', trim($ip));
    
    $cacheDir = sys_get_temp_dir() . '/gradify_rate_limits';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0777, true);
    }

    $lockFile = $cacheDir . '/lock_' . md5($ip . '_' . $action);
    $dataFile = $cacheDir . '/data_' . md5($ip . '_' . $action);

    $fp = fopen($lockFile, 'c');
    if (!$fp) return;

    if (flock($fp, LOCK_EX)) {
        $now = time();
        $data = ['count' => 0, 'start' => $now];

        if (file_exists($dataFile)) {
            $content = @file_get_contents($dataFile);
            if ($content) {
                $parsed = json_decode($content, true);
                if (is_array($parsed) && isset($parsed['start'], $parsed['count'])) {
                    $data = $parsed;
                }
            }
        }

        $elapsed = $now - $data['start'];

        if ($elapsed > $windowSeconds) {
            $data = ['count' => 1, 'start' => $now];
        } else {
            $data['count']++;
        }

        if ($data['count'] > $maxRequests) {
            flock($fp, LOCK_UN);
            fclose($fp);
            http_response_code(429);
            header('Retry-After: ' . ($windowSeconds - $elapsed));
            exit(json_encode(['error' => 'Too many requests. Please slow down.']));
        }

        @file_put_contents($dataFile, json_encode($data));
        flock($fp, LOCK_UN);
    }
    fclose($fp);
}
