import express from "express";
import Campaign from "../campaign/campaign.model.js";
import Contact from "../contact/contact.model.js";

const router = express.Router();

router.get("/open/:campaignId/:contactId", async (req, res) => {
  await Campaign.findByIdAndUpdate(req.params.campaignId, {
    $inc: { "stats.opens": 1 },
  });

  await Contact.findByIdAndUpdate(req.params.contactId, {
    $inc: { "emailEngagement.opens": 1 },
  });

  res.set("Content-Type", "image/png");
  res.send(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB", "base64"));
});

export default router;