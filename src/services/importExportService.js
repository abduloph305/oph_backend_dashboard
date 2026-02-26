import csv from "csv-parser";
import fs from "fs";
import { Parser } from "json2csv";
import Contact from "../modules/contact/contact.model.js";

/**
 * Parse CSV file and import contacts
 */
export const importContactsFromCSV = async (filePath, options = {}) => {
  return new Promise((resolve, reject) => {
    const contacts = [];
    const errors = [];
    let lineNumber = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        lineNumber++;

        try {
          // Validate required fields
          if (!row.email) {
            errors.push({
              line: lineNumber,
              error: "Missing email",
              row,
            });
            return;
          }

          // Normalize and clean data
          const contact = {
            email: row.email.toLowerCase().trim(),
            name: row.name?.trim() || "",
            phone: row.phone?.trim() || "",
            location: row.location?.trim() || "",
            tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
            totalSpent: parseFloat(row.totalSpent) || 0,
            lastOrderDate: row.lastOrderDate ? new Date(row.lastOrderDate) : null,
            cartValue: parseFloat(row.cartValue) || 0,
            categoryInterest: row.categoryInterest ? row.categoryInterest.split(",").map((c) => c.trim()) : [],
            customAttributes: {},
          };

          // Add any extra columns as custom attributes
          const knownFields = ["email", "name", "phone", "location", "tags", "totalSpent", "lastOrderDate", "cartValue", "categoryInterest"];
          Object.entries(row).forEach(([key, value]) => {
            if (!knownFields.includes(key)) {
              contact.customAttributes[key] = value;
            }
          });

          contacts.push(contact);
        } catch (error) {
          errors.push({
            line: lineNumber,
            error: error.message,
            row,
          });
        }
      })
      .on("end", async () => {
        try {
          // Bulk insert with upsert
          const result = await Contact.bulkWrite(
            contacts.map((contact) => ({
              updateOne: {
                filter: { email: contact.email },
                update: { $set: contact },
                upsert: true,
              },
            }))
          );

          resolve({
            success: true,
            imported: result.upsertedCount + result.modifiedCount,
            errors,
            details: result,
          });
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

/**
 * Export contacts to CSV
 */
export const exportContactsToCSV = async (filter = {}, includeFields = null) => {
  try {
    const contacts = await Contact.find(filter).lean();

    if (contacts.length === 0) {
      return null;
    }

    // Flatten customAttributes for CSV
    const flatContacts = contacts.map((contact) => ({
      email: contact.email,
      name: contact.name,
      phone: contact.phone,
      location: contact.location,
      tags: contact.tags.join("; "),
      totalSpent: contact.totalSpent,
      lastOrderDate: contact.lastOrderDate,
      cartValue: contact.cartValue,
      categoryInterest: contact.categoryInterest.join("; "),
      opens: contact.emailEngagement.opens,
      clicks: contact.emailEngagement.clicks,
      subscriptionStatus: contact.subscriptionStatus,
      source: contact.source,
      ...contact.customAttributes,
    }));

    const json2csvParser = new Parser({
      fields: includeFields || Object.keys(flatContacts[0]),
    });

    return json2csvParser.parse(flatContacts);
  } catch (error) {
    console.error("Export error:", error);
    throw error;
  }
};

import { buildQuery } from "./segmentationService.js";

/**
 * Export segment contacts
 */
export const exportSegmentContactsToCSV = async (segmentId, includeFields = null) => {
  try {
    const Segment = (await import("../modules/segment/segment.model.js")).default;
    // Get segment rules and build query
    const segment = await Segment.findById(segmentId);
    if (!segment) throw new Error("Segment not found");

    const query = buildQuery(segment.rules, segment.logic);

    // Filter by segment
    return await exportContactsToCSV(query, includeFields);
  } catch (error) {
    console.error("Segment export error:", error);
    throw error;
  }
};

import * as XLSX from "xlsx";

/**
 * Import contacts from Excel (XLSX)
 */
export const importContactsFromExcel = async (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const contacts = [];
    const errors = [];
    let rowNumber = 0;

    for (const row of rows) {
      rowNumber++;
      try {
        if (!row.email) {
          errors.push({ line: rowNumber, error: "Missing email", row });
          continue;
        }

        const contact = {
          email: String(row.email).toLowerCase().trim(),
          name: String(row.name || "").trim(),
          phone: String(row.phone || "").trim(),
          location: String(row.location || "").trim(),
          tags: row.tags ? String(row.tags).split(",").map((t) => t.trim()) : [],
          totalSpent: parseFloat(row.totalSpent) || 0,
          lastOrderDate: row.lastOrderDate ? new Date(row.lastOrderDate) : null,
          cartValue: parseFloat(row.cartValue) || 0,
          categoryInterest: row.categoryInterest ? String(row.categoryInterest).split(",").map((c) => c.trim()) : [],
          customAttributes: {},
        };

        const knownFields = ["email", "name", "phone", "location", "tags", "totalSpent", "lastOrderDate", "cartValue", "categoryInterest"];
        Object.entries(row).forEach(([key, value]) => {
          if (!knownFields.includes(key)) {
            contact.customAttributes[key] = value;
          }
        });

        contacts.push(contact);
      } catch (err) {
        errors.push({ line: rowNumber, error: err.message, row });
      }
    }

    const result = await Contact.bulkWrite(
      contacts.map((contact) => ({
        updateOne: {
          filter: { email: contact.email },
          update: { $set: contact },
          upsert: true,
        },
      }))
    );

    return {
      success: true,
      imported: (result.upsertedCount || 0) + (result.modifiedCount || 0),
      errors,
    };
  } catch (error) {
    console.error("Excel import error:", error);
    throw error;
  }
};

/**
 * Validate CSV headers
 */
export const validateCSVHeaders = (filePath) => {
  return new Promise((resolve, reject) => {
    const headers = [];
    let isFirstRow = true;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        if (isFirstRow) {
          Object.keys(row).forEach((key) => headers.push(key));
          isFirstRow = false;
        }
      })
      .on("end", () => {
        resolve({
          headers,
          hasEmail: headers.includes("email"),
        });
      })
      .on("error", reject);
  });
};

/**
 * Get import preview
 */
export const getImportPreview = async (filePath, limit = 5) => {
  return new Promise((resolve, reject) => {
    const preview = [];
    let count = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        if (count < limit) {
          preview.push(row);
          count++;
        }
      })
      .on("end", () => {
        resolve(preview);
      })
      .on("error", reject);
  });
};
