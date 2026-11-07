<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Start PHP Session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Define Node.js API Base URL
define('API_BASE_URL', 'http://localhost:5000/api');

/**
 * Helper function to send cURL requests to the Node.js backend
 */
function makeApiRequest($endpoint, $method = 'GET', $data = null, $token = null) {
    $url = API_BASE_URL . $endpoint;
    $ch = curl_init($url);

    $headers = [
        'Content-Type: application/json'
    ];

    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'status' => $httpCode,
        'data' => json_decode($response, true)
    ];
}

/**
 * Compatibility wrapper for legacy code calling callApi()
 */
function callApi($endpoint, $method = 'GET', $data = null, $token = null) {
    return makeApiRequest($endpoint, $method, $data, $token);
}
?>