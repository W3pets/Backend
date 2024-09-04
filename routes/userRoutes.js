import express from "express";
import { login, register } from "../controllers/userController.js";
import { preventLoggedUser } from "../helpers/auth.js";

const router = express.Router();

router.post("/login", preventLoggedUser, login);

router.post("/register", preventLoggedUser, register);

export default router;
