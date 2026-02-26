import app from "../src/app.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        isConnected = true;
        console.log("✅ MongoDB Connected (Serverless)");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err);
    }
};

export default async (req, res) => {
    await connectDB();
    return app(req, res);
};
