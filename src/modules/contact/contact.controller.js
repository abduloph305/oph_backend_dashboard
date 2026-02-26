import * as ContactService from "./contact.service.js";
import * as ImportExportService from "../../services/importExportService.js";
import * as ListHygieneService from "../../services/listHygieneService.js";
import multer from "multer";
import path from "path";

// Set up file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".csv" || ext === ".xlsx" || ext === ".xls") {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files are allowed"));
    }
  },
});

/**
 * Create contact
 */
export const create = async (req, res, next) => {
  try {
    const contact = await ContactService.createContact(req.body);
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
};

/**
 * Update contact
 */
export const update = async (req, res, next) => {
  try {
    const contact = await ContactService.updateContact(
      req.params.id,
      req.body
    );

    res.json(contact);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete contact
 */
export const remove = async (req, res, next) => {
  try {
    await ContactService.deleteContact(req.params.id);
    res.json({ message: "Contact deleted successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get contacts
 */
export const list = async (req, res, next) => {
  try {
    const contacts = await ContactService.getContacts(req.query);
    res.json(contacts);
  } catch (err) {
    next(err);
  }
};

/**
 * Get contact by ID
 */
export const getById = async (req, res, next) => {
  try {
    const contact = await ContactService.getContactById(req.params.id);
    res.json(contact);
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk update contacts
 */
export const bulkUpdate = async (req, res, next) => {
  try {
    const { ids, updateData } = req.body;
    const result = await ContactService.bulkUpdateContacts(ids, updateData);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk delete contacts
 */
export const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const result = await ContactService.bulkDeleteContacts(ids);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Import contacts from CSV
 */
export const importCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await ImportExportService.importContactsFromCSV(req.file.path);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Export contacts to CSV
 */
export const exportCSV = async (req, res, next) => {
  try {
    const { filter, fields } = req.query;
    const csv = await ImportExportService.exportContactsToCSV(
      filter ? JSON.parse(filter) : {},
      fields ? fields.split(",") : null
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=contacts.csv");
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

/**
 * Get import preview
 */
export const getImportPreview = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const preview = await ImportExportService.getImportPreview(req.file.path, 5);
    res.json({ preview });
  } catch (err) {
    next(err);
  }
};

/**
 * Validate CSV headers
 */
export const validateCSVHeaders = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const validation = await ImportExportService.validateCSVHeaders(req.file.path);
    res.json(validation);
  } catch (err) {
    next(err);
  }
};

// LIST HYGIENE ENDPOINTS

/**
 * Get list hygiene report
 */
export const getHygieneReport = async (req, res, next) => {
  try {
    const report = await ListHygieneService.getListHygieneReport();
    res.json(report);
  } catch (err) {
    next(err);
  }
};

/**
 * Clean list (remove duplicates, mark invalid)
 */
export const cleanList = async (req, res, next) => {
  try {
    const result = await ListHygieneService.cleanList();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Remove duplicates
 */
export const removeDuplicates = async (req, res, next) => {
  try {
    const { field = "email" } = req.body;
    const result = await ListHygieneService.removeDuplicates(field);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Mark invalid emails
 */
export const validateEmails = async (req, res, next) => {
  try {
    const result = await ListHygieneService.markInvalidEmails();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Add to bounce list
 */
export const addToBounceList = async (req, res, next) => {
  try {
    const { emails } = req.body;
    const result = await ListHygieneService.addToBounceList(emails);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Add to unsubscribe list
 */
export const addToUnsubscribeList = async (req, res, next) => {
  try {
    const { emails } = req.body;
    const result = await ListHygieneService.addToUnsubscribeList(emails);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Get inactive contacts
 */
export const getInactiveContacts = async (req, res, next) => {
  try {
    const { days = 90 } = req.query;
    const contacts = await ListHygieneService.getInactiveContacts(parseInt(days));
    res.json(contacts);
  } catch (err) {
    next(err);
  }
};

export { upload };