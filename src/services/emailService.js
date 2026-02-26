import { Resend } from "resend";
// import Contact from "../contact/contact.model.js";
import Contact from '../modules/contact/contact.model.js';
import Campaign from "../modules/campaign/campaign.model.js";
import EmailTracking from "../modules/analytics/emailtracking.model.js";
import { v4 as uuidv4 } from "uuid";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email via Resend
 */
export const sendEmail = async (to, subject, htmlContent, plainText = null, metadata = {}) => {
  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@resend.dev",
      to,
      subject,
      html: htmlContent,
      text: plainText,
      headers: {
        "X-Entity-Ref-ID": metadata.trackingId || "",
      },
      tags: metadata.tags || [],
    });

    return response;
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
};

/**
 * Personalize email content with tokens
 */
export const personalizeContent = (content, contact) => {
  let personalizedContent = content;

  // Replace common tokens
  personalizedContent = personalizedContent.replace(/\{\{name\}\}/g, contact.name || "there");
  personalizedContent = personalizedContent.replace(/\{\{email\}\}/g, contact.email);
  personalizedContent = personalizedContent.replace(/\{\{phone\}\}/g, contact.phone || "");

  // Replace custom attributes
  if (contact.customAttributes) {
    Object.entries(contact.customAttributes).forEach(([key, value]) => {
      const token = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      personalizedContent = personalizedContent.replace(token, value);
    });
  }

  return personalizedContent;
};

/**
 * Add product widget to email
 */
export const injectProductWidget = async (htmlContent, widget) => {
  if (!widget || !widget.type) return htmlContent;

  const Product = (await import("../modules/product/product.model.js")).default;
  let products = [];

  try {
    if (widget.type === "category" && widget.category) {
      products = await Product.find({ category: widget.category }).limit(4).lean();
    } else if (widget.type === "best_seller") {
      products = await Product.find({ isBestSeller: true }).limit(4).lean();
    } else if (widget.type === "manual" && widget.productIds) {
      products = await Product.find({ _id: { $in: widget.productIds } }).lean();
    }

    if (products.length === 0) return htmlContent;

    const productsHTML = products.map(product => `
      <div style="display: inline-block; width: 45%; margin: 2%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; vertical-align: top;">
        <img src="${product.image}" alt="${product.name}" style="width: 100%; height: auto; border-radius: 4px;">
        <h3 style="font-size: 16px; margin: 10px 0 5px;">${product.name}</h3>
        <p style="color: #4F46E5; font-weight: bold; font-size: 18px;">$${product.price}</p>
        <a href="${process.env.STORE_URL}/product/${product._id}" style="display: block; background: #4F46E5; color: white; text-align: center; padding: 8px; text-decoration: none; border-radius: 4px; font-size: 14px;">View Product</a>
      </div>
    `).join("");

    const widgetMarker = `<!-- PRODUCT_WIDGET_${widget.id} -->`;
    if (htmlContent.includes(widgetMarker)) {
      return htmlContent.replace(widgetMarker, productsHTML);
    }

    // Fallback: append before footer if exists, or at the end
    if (htmlContent.includes("</footer>")) {
      return htmlContent.replace("</footer>", `${productsHTML}</footer>`);
    }

    return htmlContent.replace("</body>", `${productsHTML}</body>`);
  } catch (error) {
    console.error("Product widget injection error:", error);
    return htmlContent;
  }
};

/**
 * Create tracking record
 */
export const createTrackingRecord = async (campaignId, contactId, email) => {
  const trackingId = uuidv4();

  const tracking = await EmailTracking.create({
    trackingId,
    campaignId,
    contactId,
    email,
    deliveryStatus: "pending",
  });

  return trackingId;
};

import { buildQuery } from "./segmentationService.js";

/**
 * Send campaign to segment
 */
export const sendCampaignToSegment = async (campaignId, segmentId, shouldSchedule = false, scheduledTime = null) => {
  try {
    // Get campaign and segment data
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const Segment = (await import("../modules/segment/segment.model.js")).default;
    const segment = await Segment.findById(segmentId);
    if (!segment) {
      throw new Error("Segment not found");
    }

    // Build query from segment rules
    const segmentQuery = buildQuery(segment.rules, segment.logic);

    const query = {
      ...segmentQuery,
      isUnsubscribed: false,
      isBounced: false,
      isValidEmail: true,
    };

    const recipients = await Contact.find(query).lean();

    // Prepare batch for sending
    const sendResults = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        // Personalize content
        const personalizedHtml = personalizeContent(campaign.htmlContent, recipient);
        const personalizedSubject = personalizeContent(campaign.subject, recipient);

        // Create tracking
        const trackingId = await createTrackingRecord(campaignId, recipient._id, recipient.email);

        // Add tracking pixel and link tracking
        const trackingHtml = addTrackingPixel(personalizedHtml, trackingId);

        // Send email
        const result = await sendEmail(recipient.email, personalizedSubject, trackingHtml, null, {
          trackingId,
          tags: [campaign.type, segmentId?.toString()],
        });

        if (result.id) {
          sendResults.sent++;

          // Update tracking record
          await EmailTracking.findOneAndUpdate({ trackingId }, { sentAt: new Date(), deliveryStatus: "sent" });
        }
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        sendResults.failed++;
        sendResults.errors.push({
          email: recipient.email,
          error: error.message,
        });
      }
    }

    // Update campaign stats
    await Campaign.findByIdAndUpdate(campaignId, {
      "stats.sent": sendResults.sent,
      status: "sent",
    });

    return sendResults;
  } catch (error) {
    console.error("Campaign send error:", error);
    throw error;
  }
};

/**
 * Add tracking pixel to email
 */
export const addTrackingPixel = (htmlContent, trackingId) => {
  const trackingPixel = `<img src="${process.env.TRACKING_PIXEL_URL}/track/open/${trackingId}" width="1" height="1" style="display:none;" />`;
  return htmlContent.replace("</body>", `${trackingPixel}</body>`);
};

/**
 * Add click tracking to links
 */
export const addClickTracking = (htmlContent, trackingId) => {
  const linkRegex = /href="([^"]*)"/g;
  return htmlContent.replace(linkRegex, (match, url) => {
    if (url.startsWith("#")) return match;
    const trackingUrl = `${process.env.TRACKING_URL}/track/click/${trackingId}?url=${encodeURIComponent(url)}`;
    return `href="${trackingUrl}"`;
  });
};

/**
 * Send batch emails using Resend Batch API
 */
export const sendBatchEmails = async (recipients, subject, htmlContent) => {
  try {
    const BATCH_LIMIT = 100;
    const batches = [];

    for (let i = 0; i < recipients.length; i += BATCH_LIMIT) {
      batches.push(recipients.slice(i, i + BATCH_LIMIT));
    }

    const results = [];

    for (const batch of batches) {
      const emailBatch = await Promise.all(batch.map(async (recipient) => {
        const trackingId = await createTrackingRecord(null, recipient._id, recipient.email);

        const personalizedSubject = personalizeContent(subject, recipient);
        let personalizedHtml = personalizeContent(htmlContent, recipient);
        personalizedHtml = addTrackingPixel(personalizedHtml, trackingId);
        personalizedHtml = addClickTracking(personalizedHtml, trackingId);

        return {
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: recipient.email,
          subject: personalizedSubject,
          html: personalizedHtml,
          tags: [{ name: "tracking_id", value: trackingId }]
        };
      }));

      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      console.log(`Resend Debug: Sending batch from ${fromEmail}`);
      console.log(`Resend Debug: Recipients: ${emailBatch.map(e => e.to).join(', ')}`);

      const response = await resend.batch.send(emailBatch);
      console.log(`Resend response:`, JSON.stringify(response, null, 2));
      results.push(response);
    }

    return results;
  } catch (error) {
    console.error("Batch send error in emailService:", error);
    throw error;
  }
};
