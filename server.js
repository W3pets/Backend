import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import userRoutes from "./routes/userRoutes.js";
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import sellerRoutes from "./routes/sellerRoutes.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const whitelist = process.env["FRONTEND_URLS"].split(",");

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// const corsOptions = {
//   origin: function (origin, callback) {
//     if (whitelist.indexOf(origin) !== -1 || !origin) callback(null, true);
//     else callback(new Error('Not allowed by CORS'));
//   }
// };

const app = express();
app.use(bodyParser.json());
app.use(cors(corsOptions));

// Swagger options
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
        url: `http://ec2-13-51-207-10.eu-north-1.compute.amazonaws.com`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js', './server.js'], // Path to the API routes files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// API Routes 
app.use("/api/users", userRoutes);
app.use("/api/sellers", sellerRoutes);

// Swagger UI middleware 
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 Route
app.use((req, res) => res.status(404).json({ message: "Resource not found" }));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
