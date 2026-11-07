<?php
require_once 'config.php';

// Check if user is authenticated
if (!isset($_SESSION['token'])) {
    header('Location: login.php');
    exit;
}

$token = $_SESSION['token'];
$apiError = '';

// Fetch list of registered users from the new admin endpoint
$usersResponse = makeApiRequest('/admin/all-users', 'GET', null, $token);
$users = [];

if ($usersResponse['status'] === 200 && isset($usersResponse['data'])) {
    $responseData = $usersResponse['data'];
    
    // Handle the backend response structure: { success: true, count: X, users: [...] }
    if (is_array($responseData)) {
        if (isset($responseData['users']) && is_array($responseData['users'])) {
            $users = $responseData['users'];
        } elseif (isset($responseData[0])) {
            $users = $responseData;
        } elseif (isset($responseData['data']) && is_array($responseData['data'])) {
            $users = $responseData['data'];
        }
    }
} else {
    $apiError = "API Error (Status {$usersResponse['status']}): " . json_encode($usersResponse['data'] ?? 'Unknown error');
}

$totalUsers = count($users);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- FontAwesome Icons -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; }
        .stat-card { border-left: 4px solid #0d6efd; transition: transform 0.2s; }
        .stat-card:hover { transform: translateY(-3px); }
        .navbar-brand { font-weight: 600; }
    </style>
</head>
<body>

    <!-- Navigation Bar -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4 shadow-sm">
        <div class="container">
            <a class="navbar-brand" href="index.php"><i class="fa-solid fa-gauge me-2"></i>Admin Dashboard</a>
            <div class="d-flex align-items-center">
                <span class="navbar-text me-3 text-light">
                    Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Admin'); ?></strong>
                </span>
                <a href="logout.php" class="btn btn-outline-light btn-sm"><i class="fa-solid fa-right-from-bracket me-1"></i>Logout</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <!-- Display API Error if any -->
        <?php if (!empty($apiError)): ?>
            <div class="alert alert-danger shadow-sm mb-4">
                <i class="fa-solid fa-triangle-exclamation me-2"></i><?php echo htmlspecialchars($apiError); ?>
            </div>
        <?php endif; ?>

        <!-- Overview Card Section -->
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="card stat-card shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted fw-normal text-uppercase mb-1" style="font-size: 0.8rem;">Total Registered Users</h6>
                                <h2 class="mb-0 fw-bold text-primary"><?php echo number_format($totalUsers); ?></h2>
                            </div>
                            <div class="bg-light p-3 rounded-circle">
                                <i class="fa-solid fa-users fa-2x text-primary"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Users Table Section -->
        <div class="card shadow-sm border-0">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 class="mb-0 text-dark fw-bold"><i class="fa-solid fa-list me-2 text-secondary"></i>User Management</h5>
                <span class="badge bg-primary rounded-pill"><?php echo count($users); ?> Total</span>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th scope="col" class="ps-3" style="width: 50px;">S/N</th>
                                <th scope="col">Name</th>
                                <th scope="col">Email</th>
                                <th scope="col">Phone</th>
                                <th scope="col">Role</th>
                                <th scope="col">Registered Date</th>
                                <th scope="col" class="text-end pe-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (!empty($users)): ?>
                                <?php $sn = 1; ?>
                                <?php foreach ($users as $user): ?>
                                    <tr>
                                        <td class="ps-3 fw-semibold text-muted"><?php echo $sn++; ?></td>
                                        <td>
                                            <div class="fw-bold"><?php echo htmlspecialchars($user['fullName'] ?? $user['name'] ?? 'N/A'); ?></div>
                                        </td>
                                        <td><?php echo htmlspecialchars($user['email'] ?? 'N/A'); ?></td>
                                        <td><?php echo htmlspecialchars($user['phone'] ?? 'N/A'); ?></td>
                                        <td>
                                            <span class="badge <?php echo (isset($user['role']) && $user['role'] === 'owner') ? 'bg-danger' : 'bg-secondary'; ?>">
                                                <?php echo htmlspecialchars(ucfirst($user['role'] ?? 'user')); ?>
                                            </span>
                                        </td>
                                        <td><?php echo isset($user['createdAt']) ? date('M d, Y', strtotime($user['createdAt'])) : 'N/A'; ?></td>
                                        <td class="text-end pe-3">
                                            <a href="user-details.php?id=<?php echo $user['_id'] ?? $user['id'] ?? ''; ?>" class="btn btn-sm btn-outline-primary">
                                                <i class="fa-solid fa-eye me-1"></i>View
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="7" class="text-center py-4 text-muted">
                                        <i class="fa-solid fa-inbox fa-2x mb-2 d-block"></i>
                                        No registered users found.
                                    </td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap 5 JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/bootstrap.bundle.min.js"></script>
</body>
</html>