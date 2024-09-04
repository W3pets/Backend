import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const whitelist = process.env["FRONTEND_URLS"].split(",");

const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
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

// Routes
app.use("/api/users", userRoutes);
app.use((req, res) => res.status(404).json({ message: "Resource not found" })); // 404 Route

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
