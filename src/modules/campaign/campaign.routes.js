import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import {
  createCampaign,
  listCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  scheduleCampaign,
  sendCampaignNow,
  pauseCampaign,
  resumeCampaign,
  getCampaignAnalytics,
  cloneCampaign,
  saveAsTemplate,
  getTemplates,
  loadTemplate,
  createABTest,
  listABTests,
  getABTest,
  getABTestPerformance,
  startABTest,
  completeABTest,
} from "./campaign.controller.js";

const router = express.Router();

router.use(authMiddleware);

// Campaign CRUD
router.post("/", createCampaign);
router.get("/", listCampaigns);
router.get("/:id", getCampaign);
router.put("/:id", updateCampaign);
router.delete("/:id", deleteCampaign);

// Campaign sending
router.post("/:id/send", sendCampaignNow);
router.post("/:id/schedule", scheduleCampaign);
router.post("/:id/pause", pauseCampaign);
router.post("/:id/resume", resumeCampaign);

// Campaign analytics
router.get("/:id/analytics", getCampaignAnalytics);

// Campaign templates
router.get("/templates/list", getTemplates);
router.post("/:id/clone", cloneCampaign);
router.post("/:id/save-template", saveAsTemplate);
router.post("/:id/load-template", loadTemplate);

// A/B Testing
router.post("/ab-test/create", createABTest);
router.get("/ab-test", listABTests);
router.get("/ab-test/:id", getABTest);
router.get("/ab-test/:id/performance", getABTestPerformance);
router.post("/ab-test/:id/start", startABTest);
router.post("/ab-test/:id/complete", completeABTest);

export default router;