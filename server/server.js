// Import required packages
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Create Express application
const app = express();

// Port configuration
const PORT = process.env.PORT || 4000;

// ===============================
// Middleware
// ===============================

// Parse JSON request body
app.use(express.json());

// Allow frontend to communicate with backend
app.use(cors());

// ===============================
// Database Connection
// ===============================

const dbConnect = require("./config/database");

// Connect to database
dbConnect();

// ===============================
// Routes
// ===============================

// Authentication routes
const authRoutes = require("./routes/auth");

// Product management routes
const productRoutes = require("./routes/products");

// Inventory receipt routes
const receiptRoutes = require("./routes/receipts");

// Delivery order routes
const deliveryRoutes = require("./routes/deliveries");

// Internal transfer routes
const transferRoutes = require("./routes/transfers");

// Inventory adjustment routes
const adjustmentRoutes = require("./routes/adjustments");

// Stock ledger / movement history routes
const ledgerRoutes = require("./routes/ledger");

// Warehouse management routes
const warehouseRoutes = require("./routes/warehouses");

// Dashboard routes
const dashboardRoutes = require("./routes/dashboard");

// ===============================
// Mount Routes
// ===============================

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/receipts", receiptRoutes);
app.use("/api/v1/deliveries", deliveryRoutes);
app.use("/api/v1/transfers", transferRoutes);
app.use("/api/v1/adjustments", adjustmentRoutes);
app.use("/api/v1/ledger", ledgerRoutes);
app.use("/api/v1/warehouses", warehouseRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

// ===============================
// Default Route
// ===============================

app.get("/", (req, res) => {
    res.send(`
        <h1>StockSense API</h1>
        <p>Inventory Management System API is running successfully.</p>
    `);
});

// ===============================
// Health Check Route
// ===============================

app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "StockSense API is running",
        timestamp: new Date().toISOString()
    });
});

// ===============================
// Handle Unknown Routes
// ===============================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found"
    });
});

// ===============================
// Start Server
// ===============================

app.listen(PORT, () => {
    console.log(`StockSense server started successfully on port ${PORT}`);
});