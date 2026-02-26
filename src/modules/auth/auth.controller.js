import * as AuthService from "./auth.service.js";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export const register = async (req, res, next) => {
  try {
    const user = await AuthService.registerUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const tokens = await AuthService.loginUser(
      req.body.email,
      req.body.password
    );

    res.json(tokens);
  } catch (err) {
    next(err);
  }
};

// Development-only endpoint to get a test token
export const getDevToken = async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ message: "Not available in production" });
  }

  const token = jwt.sign(
    { id: "dev-user", email: "dev@test.com", name: "Dev User" },
    env.jwtSecret,
    { expiresIn: "7d" }
  );

  res.json({ accessToken: token, refreshToken: token });
};