import express from "express";
import {
  create,
  update,
  remove,
  list,
  getById,
  bulkUpdate,
  bulkDelete,
  importCSV,
  exportCSV,
  getImportPreview,
  validateCSVHeaders,
  getHygieneReport,
  cleanList,
  removeDuplicates,
  validateEmails,
  addToBounceList,
  addToUnsubscribeList,
  getInactiveContacts,
  upload,
} from "./contact.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

// Basic CRUD
router.post("/", create);
router.get("/", list);
router.get("/:id", getById);
router.put("/:id", update);
router.delete("/:id", remove);

// Bulk operations
router.post("/bulk/update", bulkUpdate);
router.post("/bulk/delete", bulkDelete);

// Import/Export
router.post("/import/csv", upload.single("file"), importCSV);
router.get("/export/csv", exportCSV);
router.post("/import/preview", upload.single("file"), getImportPreview);
router.post("/import/validate", upload.single("file"), validateCSVHeaders);

// List Hygiene
router.get("/hygiene/report", getHygieneReport);
router.post("/hygiene/clean", cleanList);
router.post("/hygiene/remove-duplicates", removeDuplicates);
router.post("/hygiene/validate-emails", validateEmails);
router.post("/hygiene/bounce-list", addToBounceList);
router.post("/hygiene/unsubscribe-list", addToUnsubscribeList);
router.get("/hygiene/inactive", getInactiveContacts);

export default router;