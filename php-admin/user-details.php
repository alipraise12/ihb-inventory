<?php
require_once 'config.php';

// Ensure user is logged in
if (!isset($_SESSION['user'])) {
    header('Location: login.php');
    exit;
}

$userId = isset($_GET['id']) ? trim($_GET['id']) : '';

if (empty($userId)) {
    header('Location: index.php');
    exit;
}

// Fetch specific user's data from your backend API endpoints
// (Note: Ensure your backend supports fetching data filtered by user/shop or adjust accordingly)
$stockResponse = call_backend_api('GET', '/api/stock'); 
$salesResponse = call_backend_api('GET', '/api/sales');
$staffResponse = call_backend_api('GET', '/api/staff/list');

$stockItems = isset($stockResponse['stock']) ? $stockResponse['stock'] : [];
$salesItems = isset($salesResponse['sales']) ? $salesResponse['sales'] : [];
$staffMembers = isset($staffResponse['staff']) ? $staffResponse['staff'] : [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>User Detail Drill-Down - Admin Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
            <a class="navbar-brand" href="index.php">Admin Panel</a>
            <div class="d-flex">
                <a href="index.php" class="btn btn-outline-light btn-sm me-2">Back to Overview</a>
                <a href="logout.php" class="btn btn-outline-danger btn-sm">Logout</a>
            </div>
        </div>
    </nav>

    <div class="container mt-4 mb-5">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="fw-bold">User Drill-Down Profile</h2>
                <p class="text-muted mb-0">Detailed view of user ID: <?php echo htmlspecialchars($userId); ?></p>
            </div>
        </div>

        <!-- 1. Stock / Inventory Section -->
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white py-3">
                <h5 class="mb-0 fw-bold text-primary">📦 Stock Items</h5>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0 align-middle">
                        <thead class="table-light">
                            <tr>
                                <th class="ps-3">S/N</th>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Total Quantity</th>
                                <th>Selling Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (!empty($stockItems)): ?>
                                <?php $sn = 1; foreach ($stockItems as $item): ?>
                                    <tr>
                                        <td class="ps-3 fw-bold"><?php echo $sn++; ?></td>
                                        <td class="fw-bold"><?php echo htmlspecialchars($item['productName']); ?></td>
                                        <td><?php echo htmlspecialchars($item['category'] ?? 'General'); ?></td>
                                        <td><?php echo htmlspecialchars($item['quantity']); ?></td>
                                        <td>₦<?php echo number_format($item['sellingPrice'], 2); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="5" class="text-center py-3 text-muted">No stock items found for this user.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 2. Sales Summary Section -->
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white py-3">
                <h5 class="mb-0 fw-bold text-success">💰 Sales Summary & Transactions</h5>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0 align-middle">
                        <thead class="table-light">
                            <tr>
                                <th class="ps-3">S/N</th>
                                <th>Sold By</th>
                                <th>Payment Method</th>
                                <th>Total Amount</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (!empty($salesItems)): ?>
                                <?php $sn = 1; foreach ($salesItems as $sale): ?>
                                    <tr>
                                        <td class="ps-3 fw-bold"><?php echo $sn++; ?></td>
                                        <td><?php echo htmlspecialchars($sale['soldBy']['fullName'] ?? 'N/A'); ?></td>
                                        <td><span class="badge bg-info text-dark"><?php echo htmlspecialchars($sale['paymentMethod']); ?></span></td>
                                        <td class="fw-bold text-success">₦<?php echo number_format($sale['totalAmount'], 2); ?></td>
                                        <td><?php echo date('Y-m-d H:i', strtotime($sale['saleDate'] ?? 'now')); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="5" class="text-center py-3 text-muted">No sales recorded yet.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 3. Staff Members Section -->
        <div class="card shadow-sm">
            <div class="card-header bg-white py-3">
                <h5 class="mb-0 fw-bold text-warning">👥 Associated Staff Members</h5>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0 align-middle">
                        <thead class="table-light">
                            <tr>
                                <th class="ps-3">S/N</th>
                                <th>Staff Full Name</th>
                                <th>Email</th>
                                <th>Phone Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (!empty($staffMembers)): ?>
                                <?php $sn = 1; foreach ($staff members as $staff): ?>
                                    <tr>
                                        <td class="ps-3 fw-bold"><?php echo $sn++; ?></td>
                                        <td class="fw-bold"><?php echo htmlspecialchars($staff['fullName']); ?></td>
                                        <td><?php echo htmlspecialchars($staff['email']); ?></td>
                                        <td><?php echo htmlspecialchars($staff['phone']); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="4" class="text-center py-3 text-muted">No registered staff members found.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</body>
</html>