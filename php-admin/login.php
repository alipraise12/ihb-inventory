<?php
require_once 'config.php';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    $response = callApi('/auth/login', 'POST', [
        'email' => $email,
        'password' => $password
    ]);

    if ($response['status'] === 200 && isset($response['data']['token'])) {
        // Save using 'token' so index.php can read it properly
        $_SESSION['token'] = $response['data']['token'];
        $_SESSION['jwt_token'] = $response['data']['token']; // keep both just in case
        $_SESSION['user'] = $response['data']['user'] ?? [];
        $_SESSION['user_name'] = $response['data']['user']['name'] ?? 'Admin';
        
        header('Location: index.php');
        exit;
    } else {
        $error = $response['data']['message'] ?? 'Invalid login credentials or server error.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Login - IHB</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
</head>
<body class="bg-light d-flex align-items-center justify-content-center" style="height: 100vh;">
    <div class="card p-4 shadow-sm" style="width: 380px;">
        <h3 class="text-center mb-3">Admin Panel</h3>
        <?php if ($error): ?>
            <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <form method="POST">
            <div class="mb-3">
                <label class="form-label">Email address</label>
                <input type="email" name="email" class="form-control" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary w-100">Login</button>
        </form>
    </div>
</body>
</html>