import express from "express";
import * as templateController from "./template.controller.js";

const router = express.Router();

router.post("/", templateController.createTemplate);
router.get("/", templateController.listTemplates);
router.get("/:id", templateController.getTemplate);
router.put("/:id", templateController.updateTemplate);
router.delete("/:id", templateController.deleteTemplate);
router.post("/send-bulk", templateController.sendBulkTemplate);

export default router;
