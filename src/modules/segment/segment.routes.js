import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import {
  createSegment,
  listSegments,
  getSegment,
  updateSegment,
  deleteSegment,
  previewSegment,
  getSampleSegmentContacts,
  getSegmentStats,
  getPreBuiltSegmentsList,
  syncSegmentContacts,
} from "./segment.controller.js";

const router = express.Router();

router.use(authMiddleware);

// Pre-built segments - must be before /:id routes
router.get("/prebuilt/list", getPreBuiltSegmentsList);

// Advanced features - must be before generic /:id routes
router.get("/:id/stats", getSegmentStats);
router.post("/:id/sync", syncSegmentContacts);

// CRUD operations
router.post("/", createSegment);
router.get("/", listSegments);
router.get("/:id", getSegment);
router.put("/:id", updateSegment);
router.delete("/:id", deleteSegment);

// Preview and sample - these don't have IDs
router.post("/preview", previewSegment);
router.post("/sample", getSampleSegmentContacts);

export default router;