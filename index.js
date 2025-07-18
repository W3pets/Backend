import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import cookieParser from "cookie-parser";
import { db } from "./helpers/db.js";


dotenv.config();

const app = express();

// Parse allowed origins from .env
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
const isProduction = process.env.NODE_ENV === "production";

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
  res.send = function (body) {
    res.locals.responseBody = body;
    return originalSend.call(this, body);
  };

  next();
});


// Middleware
app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - support multiple origins
app.use(cors({
  origin: function (origin, callback) {
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
app.options('*', cors({
  origin: function (origin, callback) {
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
app.use("/api/messages", messageRoutes);

app.get('/delete_all', async (req, res) => {
  const user = await db.user.delete({
    where: {
      email: '',
    },
  })
  res.status(200).json({
    documentation: "/docs",
  });
});

app.get('/_ah/health', (req, res) => {
  res.status(200).send('OK');
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({
    message: "Something went wrong!",
    error: !isProduction ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 