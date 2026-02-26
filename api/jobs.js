import mongoose from "mongoose";
import dotenv from "dotenv";
import Campaign from "../src/modules/campaign/campaign.model.js";
import ABTest from "../src/modules/campaign/abtest.model.js";
import { processCampaign, processABTest } from "../src/jobs/campaign.worker.js";

dotenv.config();

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        isConnected = true;
    } catch (err) {
        console.error("MongoDB connection error in Cron:", err);
    }
};

export default async (req, res) => {
    // Basic auth check for Cron
    if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        await connectDB();

        const campaigns = await Campaign.find({
            status: "scheduled",
            scheduledAt: { $lte: new Date() },
        }).limit(5);

        for (const campaign of campaigns) {
            await processCampaign(campaign);
        }

        const abTests = await ABTest.find({
            status: "running",
            startedAt: { $lte: new Date() },
        }).limit(2);

        for (const abTest of abTests) {
            await processABTest(abTest);
        }

        return res.status(200).json({
            processedCampaigns: campaigns.length,
            processedABTests: abTests.length
        });
    } catch (err) {
        console.error("Cron execution error:", err);
        return res.status(500).json({ error: err.message });
    }
};
