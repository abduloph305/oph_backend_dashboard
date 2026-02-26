import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const authMiddleware = (req, res, next) => {
  // Allow requests in development mode without token
  if (process.env.NODE_ENV === "development") {
    req.user = { id: "dev-user", email: "dev@test.com" };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authMiddleware;