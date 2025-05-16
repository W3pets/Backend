import express from "express";
import cors from "cors";
import { loadConfig } from "./helpers/config.js";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";

// Load environment variables
await loadConfig();

const app = express();

// Parse allowed origins from .env
const allowedOrigins = (process.env.FRONTEND_URLS || '').split(',').map(url => url.trim()).filter(Boolean);

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestBody: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      responseBody: res.locals.responseBody || undefined
    };
    
    // Log different levels based on status code
    if (res.statusCode >= 500) {
      console.error('Server Error:', logData);
    } else if (res.statusCode >= 400) {
      console.warn('Client Error:', logData);
    } else {
      console.log('Request:', logData);
    }
  });

  // Store response body for logging
  const originalSend = res.send;
  res.send = function(body) {
    res.locals.responseBody = body;
    return originalSend.call(this, body);
  };

  next();
});

// CORS configuration - support multiple origins
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger JSDoc setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'W3pets API',
      version: '1.0.0',
      description: 'API documentation for W3pets backend',
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:3000',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js', './index.js'], // Scan these files for JSDoc
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// API Documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
  console.log('CORS is configured for these origins:', allowedOrigins);
}); 