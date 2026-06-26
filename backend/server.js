require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const apiRoutes = require("./routes");
const uploadRoutes = require("./routes/uploadRoutes");
const authRoutes = require("./routes/authRoutes");
const historyRoutes = require("./routes/historyRoutes");
const scansRoutes = require("./routes/scansRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'https://getverifaid.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(morgan("dev"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Verifai backend is running." });
});

// Routes
app.use("/api", apiRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/scan", scansRoutes);

// Error handler — always last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});