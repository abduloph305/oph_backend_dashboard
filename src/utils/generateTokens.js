import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    env.jwtSecret,
    { expiresIn: "15m" }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    env.jwtRefreshSecret,
    { expiresIn: "7d" }
  );
};