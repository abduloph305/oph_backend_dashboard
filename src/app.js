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

const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5000",
    "https://ophfrontenddashboard.vercel.app",
    "https://ophfrontenddashboard-iu2ofop11-abduloph305-8893s-projects.vercel.app"
]);

app.use(
    cors({
        origin: (origin, callback) => {
            console.log("Incoming origin:", origin);

            if (!origin) return callback(null, true);

            if (allowedOrigins.has(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

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
