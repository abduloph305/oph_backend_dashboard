import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes.js";
import contactRoutes from "./modules/contact/contact.routes.js";
import campaignRoutes from "./modules/campaign/campaign.routes.js";
import segmentRoutes from "./modules/segment/segment.routes.js";
import productRoutes from "./modules/product/product.routes.js";
import trackingRoutes from "./modules/analytics/tracking.routes.js";

import { errorHandler } from "./middlewares/error.middleware.js";

import templateRoutes from "./modules/template/template.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/segments", segmentRoutes);
app.use("/api/products", productRoutes);
app.use("/api/templates", templateRoutes);
app.use("/track", trackingRoutes);

// Global error handler
app.use(errorHandler);
export default app;
