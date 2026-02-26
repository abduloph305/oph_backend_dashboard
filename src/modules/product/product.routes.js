import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import {
  createProduct,
  listProducts,
} from "./product.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createProduct);
router.get("/", listProducts);

export default router;