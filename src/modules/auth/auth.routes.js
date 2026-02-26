import express from "express";
import { register, login, getDevToken } from "./auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/dev-token", getDevToken); // Development only endpoint

export default router;