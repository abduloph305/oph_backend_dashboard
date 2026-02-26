import EmailTemplate from "./emailtemplate.model.js";
import Contact from "../contact/contact.model.js";
import { sendBatchEmails } from "../../services/emailService.js";

export const createTemplate = async (req, res, next) => {
    try {
        const template = await EmailTemplate.create(req.body);
        res.status(201).json(template);
    } catch (err) {
        next(err);
    }
};

export const listTemplates = async (req, res, next) => {
    try {
        const templates = await EmailTemplate.find().sort({ createdAt: -1 }).lean();
        res.json(templates);
    } catch (err) {
        next(err);
    }
};

export const getTemplate = async (req, res, next) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        if (!template) return res.status(404).json({ message: "Template not found" });
        res.json(template);
    } catch (err) {
        next(err);
    }
};

export const updateTemplate = async (req, res, next) => {
    try {
        const template = await EmailTemplate.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        res.json(template);
    } catch (err) {
        next(err);
    }
};

export const deleteTemplate = async (req, res, next) => {
    try {
        await EmailTemplate.findByIdAndDelete(req.params.id);
        res.json({ message: "Template deleted" });
    } catch (err) {
        next(err);
    }
};

import Segment from "../segment/segment.model.js";
import { buildQuery } from "../../services/segmentationService.js";

import mongoose from "mongoose";

/**
 * Send a template to multiple recipients (Bulk Send)
 */
export const sendBulkTemplate = async (req, res, next) => {
    try {
        const { templateId, contactIds, segmentId, subject } = req.body;

        const template = await EmailTemplate.findById(templateId);
        if (!template) return res.status(404).json({ message: "Template not found" });

        let query = {
            isUnsubscribed: false,
            isBounced: false,
            isValidEmail: true,
        };

        if (segmentId) {
            const segment = await Segment.findById(segmentId);
            if (!segment) return res.status(404).json({ message: "Segment not found" });
            const segmentQuery = buildQuery(segment.rules, segment.logic);
            query = { ...query, ...segmentQuery };
        } else if (contactIds && contactIds.length > 0) {
            const ids = [];
            const emails = [];

            const allVals = [];
            contactIds.forEach(v => {
                if (typeof v === 'string') {
                    v.split(/[\n,]+/).forEach(s => allVals.push(s.trim()));
                } else {
                    allVals.push(v);
                }
            });

            allVals.forEach(val => {
                if (!val) return;
                const trimmed = val.toString().trim();
                if (!trimmed) return;

                if (trimmed.includes('@')) {
                    emails.push(trimmed.toLowerCase());
                } else if (mongoose.Types.ObjectId.isValid(trimmed)) {
                    ids.push(new mongoose.Types.ObjectId(trimmed));
                }
            });

            if (ids.length === 0 && emails.length === 0) {
                return res.status(400).json({ message: "No valid recipient IDs or emails provided" });
            }

            const orConditions = [];
            if (ids.length > 0) orConditions.push({ _id: { $in: ids } });
            if (emails.length > 0) orConditions.push({ email: { $in: emails } });

            query.$or = orConditions;
        } else {
            return res.status(400).json({ message: "No recipients specified (provide contactIds or segmentId)" });
        }

        let contacts = await Contact.find(query).lean();

        // Auto-create contacts for emails that aren't in the database yet
        // This is essential for e-commerce admins who want to send to a list of users
        if (contactIds && contactIds.length > 0) {
            const requestedEmails = contactIds
                .map(val => val.trim().toLowerCase())
                .filter(val => val.includes('@'));

            const foundEmails = contacts.map(c => c.email.toLowerCase());
            const missingEmails = requestedEmails.filter(email => !foundEmails.includes(email));

            if (missingEmails.length > 0) {
                console.log(`Auto-creating ${missingEmails.length} contacts for Resend bulk send`);
                const autoCreated = await Promise.all(missingEmails.map(async (email) => {
                    try {
                        return await Contact.create({
                            email,
                            name: email.split('@')[0],
                            source: "bulk_send_admin_direct",
                            isValidEmail: true
                        });
                    } catch (err) {
                        return await Contact.findOne({ email }).lean();
                    }
                }));
                contacts = [...contacts, ...autoCreated.filter(Boolean)];
            }
        }

        if (contacts.length === 0) {
            console.warn(`Bulk send failed: No valid recipients found for query:`, query);
            return res.status(400).json({
                message: "We couldn't find any valid recipients to send to. Please check your email list or segment."
            });
        }

        if (!template.htmlContent) {
            return res.status(400).json({ message: "Template has no content to send." });
        }

        // Process bulk send
        console.log(`Initiating bulk send for template ${templateId} to ${contacts.length} recipients`);
        const result = await sendBatchEmails(contacts, subject || template.name, template.htmlContent);

        // Update template usage
        await EmailTemplate.findByIdAndUpdate(templateId, { $inc: { usageCount: 1 } });

        res.json({
            message: "Bulk send initiated successfully via Resend API",
            recipientCount: contacts.length,
            result,
        });
    } catch (err) {
        next(err);
    }
};
