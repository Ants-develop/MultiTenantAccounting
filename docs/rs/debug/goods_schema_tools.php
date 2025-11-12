<?php
/**
 * GOODS SCHEMA ANALYSIS TOOLS
 * 
 * Navigation page for goods-related schema analysis and management tools.
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../functions.php';

// Check authentication
if (!isLoggedIn()) {
    header('Location: /login.php');
    exit;
}

// Admin only
if (!isAdmin()) {
    header('HTTP/1.0 403 Forbidden');
    echo '<h1>403 Forbidden</h1><p>Admin access required.</p>';
    exit;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Goods Schema Analysis Tools</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .tool-card {
            transition: transform 0.2s;
            height: 100%;
        }
        .tool-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .icon-large {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <?php include '../../menu.php'; ?>
    
    <div class="container mt-5">
        <div class="row">
            <div class="col-12">
                <h1 class="mb-4">
                    <i class="bi bi-tools"></i>
                    Goods Schema Analysis Tools
                </h1>
                <p class="lead">
                    Tools for analyzing RS.GE goods API endpoints and managing database schema.
                </p>
            </div>
        </div>
        
        <div class="row g-4">
            <!-- API Field Analyzer -->
            <div class="col-md-6 col-lg-4">
                <div class="card tool-card">
                    <div class="card-body text-center">
                        <i class="bi bi-search icon-large text-primary"></i>
                        <h5 class="card-title">API Field Analyzer</h5>
                        <p class="card-text">
                            Analyze RS.GE goods API endpoints to discover all available fields, 
                            data types, and sample values.
                        </p>
                        <a href="analyze_goods_api_fields.php" class="btn btn-primary">
                            <i class="bi bi-play-circle"></i> Start Analysis
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Schema Generator -->
            <div class="col-md-6 col-lg-4">
                <div class="card tool-card">
                    <div class="card-body text-center">
                        <i class="bi bi-diagram-3 icon-large text-success"></i>
                        <h5 class="card-title">Schema Generator</h5>
                        <p class="card-text">
                            Generate optimized MSSQL table schemas based on API field analysis 
                            and provide update recommendations.
                        </p>
                        <a href="update_goods_schema.php" class="btn btn-success">
                            <i class="bi bi-gear"></i> Generate Schema
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Schema Validator -->
            <div class="col-md-6 col-lg-4">
                <div class="card tool-card">
                    <div class="card-body text-center">
                        <i class="bi bi-check-circle icon-large text-info"></i>
                        <h5 class="card-title">Schema Validator</h5>
                        <p class="card-text">
                            Check and validate current database table schemas against 
                            required structures.
                        </p>
                        <a href="check_tables.php" class="btn btn-info">
                            <i class="bi bi-shield-check"></i> Check Tables
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Sync Tester -->
            <div class="col-md-6 col-lg-4">
                <div class="card tool-card">
                    <div class="card-body text-center">
                        <i class="bi bi-arrow-repeat icon-large text-warning"></i>
                        <h5 class="card-title">Goods Sync Tester</h5>
                        <p class="card-text">
                            Test the goods synchronization functionality with real 
                            waybill data.
                        </p>
                        <a href="test_goods_sync.php" class="btn btn-warning">
                            <i class="bi bi-play"></i> Test Sync
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- General API Analyzer -->
            <div class="col-md-6 col-lg-4">
                <div class="card tool-card">
                    <div class="card-body text-center">
                        <i class="bi bi-cpu icon-large text-secondary"></i>
                        <h5 class="card-title">General API Analyzer</h5>
                        <p class="card-text">
                            Comprehensive API field analyzer for all RS.GE endpoints 
                            (waybills, invoices, etc.).
                        </p>
                        <a href="analyze_api_fields.php" class="btn btn-secondary">
                            <i class="bi bi-cpu"></i> Analyze All APIs
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Documentation -->
            <div class="col-md-6 col-lg-4">
                <div class="card tool-card">
                    <div class="card-body text-center">
                        <i class="bi bi-book icon-large text-dark"></i>
                        <h5 class="card-title">Documentation</h5>
                        <p class="card-text">
                            View implementation details, usage instructions, and 
                            troubleshooting guides.
                        </p>
                        <button class="btn btn-dark" data-bs-toggle="modal" data-bs-target="#docsModal">
                            <i class="bi bi-book"></i> View Docs
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Workflow Section -->
        <div class="row mt-5">
            <div class="col-12">
                <div class="card bg-light">
                    <div class="card-header">
                        <h4><i class="bi bi-workflow"></i> Recommended Workflow</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3 text-center mb-3">
                                <div class="badge bg-primary rounded-pill mb-2" style="font-size: 1.5rem;">1</div>
                                <h6>Analyze API</h6>
                                <p class="small">Run API Field Analyzer to discover actual field structure</p>
                            </div>
                            <div class="col-md-3 text-center mb-3">
                                <div class="badge bg-success rounded-pill mb-2" style="font-size: 1.5rem;">2</div>
                                <h6>Generate Schema</h6>
                                <p class="small">Use Schema Generator to create optimized table definitions</p>
                            </div>
                            <div class="col-md-3 text-center mb-3">
                                <div class="badge bg-info rounded-pill mb-2" style="font-size: 1.5rem;">3</div>
                                <h6>Validate Tables</h6>
                                <p class="small">Check current schema and apply updates if needed</p>
                            </div>
                            <div class="col-md-3 text-center mb-3">
                                <div class="badge bg-warning rounded-pill mb-2" style="font-size: 1.5rem;">4</div>
                                <h6>Test Sync</h6>
                                <p class="small">Verify goods sync functionality works correctly</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Documentation Modal -->
    <div class="modal fade" id="docsModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Goods Schema Tools Documentation</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <h6>🔍 API Field Analyzer</h6>
                    <p>This tool makes live API calls to RS.GE to discover:</p>
                    <ul>
                        <li>All available fields in goods API responses</li>
                        <li>Data types and maximum field lengths</li>
                        <li>Sample values for each field</li>
                        <li>Comparison with current database schema</li>
                    </ul>
                    
                    <h6>🏗️ Schema Generator</h6>
                    <p>Generates optimized MSSQL CREATE TABLE statements with:</p>
                    <ul>
                        <li>Appropriate data types based on API analysis</li>
                        <li>Proper field lengths and constraints</li>
                        <li>Comments explaining each field's purpose</li>
                        <li>Internal tracking fields for sync management</li>
                    </ul>
                    
                    <h6>✅ Schema Validator</h6>
                    <p>Validates and manages database tables:</p>
                    <ul>
                        <li>Checks if required tables exist</li>
                        <li>Validates table structure and constraints</li>
                        <li>Can create missing tables automatically</li>
                        <li>Reports schema differences and issues</li>
                    </ul>
                    
                    <h6>🔄 Goods Sync Tester</h6>
                    <p>Tests the goods synchronization functionality:</p>
                    <ul>
                        <li>Uses real company credentials and waybill IDs</li>
                        <li>Tests both seller and buyer goods APIs</li>
                        <li>Verifies data insertion and updates</li>
                        <li>Provides detailed sync statistics</li>
                    </ul>
                    
                    <h6>⚠️ Important Notes</h6>
                    <div class="alert alert-warning">
                        <ul class="mb-0">
                            <li>Always backup your database before applying schema changes</li>
                            <li>Test tools in development environment first</li>
                            <li>API analysis requires valid RS.GE credentials</li>
                            <li>Large API responses may take several minutes to process</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
