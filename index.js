import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json" assert { type: "json" };
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";

dotenv.config();

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log('\n=== New Request ===');
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Files:', req.files);
  console.log('==================\n');
  next();
});

// CORS configuration - allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/seller", sellerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('\n=== Error ===');
  console.error(err.stack);
  console.error('=============\n');
  
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('CORS is configured to allow all origins');
}); 