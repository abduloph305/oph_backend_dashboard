import Campaign from "../modules/campaign/campaign.model.js";
import Contact from "../modules/contact/contact.model.js";
import ABTest from "../modules/campaign/abtest.model.js";
import { buildQuery } from "../services/segmentationService.js";
import { sendEmail, personalizeContent, injectProductWidget, createTrackingRecord, addTrackingPixel, addClickTracking } from "../services/emailService.js";

const BATCH_SIZE = 100;

export const processCampaign = async (campaign) => {
  campaign.status = "processing";
  await campaign.save();

  const Segment = (await import("../modules/segment/segment.model.js")).default;
  const segment = await Segment.findById(campaign.segmentId);
  if (!segment) {
    campaign.status = "failed";
    await campaign.save();
    return;
  }

  const query = {
    ...buildQuery(segment.rules, segment.logic),
    isUnsubscribed: false,
    isBounced: false,
    isValidEmail: true,
  };

  const contacts = await Contact.find(query).cursor();
  await sendToContacts(contacts, campaign);

  campaign.status = "sent";
  await campaign.save();
};

const sendToContacts = async (contacts, campaign) => {
  for await (const contact of contacts) {
    try {
      // Personalize
      let html = personalizeContent(campaign.htmlContent, contact);
      const subject = personalizeContent(campaign.subject, contact);

      // Inject widgets if any
      if (campaign.emailBlocks) {
        for (const block of campaign.emailBlocks) {
          if (block.type === "product") {
            html = await injectProductWidget(html, block.settings);
          }
        }
      }

      // Tracking
      const trackingId = await createTrackingRecord(campaign._id, contact._id, contact.email);
      html = addTrackingPixel(html, trackingId);
      html = addClickTracking(html, trackingId);

      // Send
      await sendEmail(contact.email, subject, html, null, { trackingId });

      campaign.stats.sent++;
    } catch (err) {
      console.error(`Failed to send to ${contact.email}:`, err);
      campaign.stats.bounces++;
    }
  }
  await campaign.save();
};

export const processABTest = async (abTest) => {
  const Segment = (await import("../modules/segment/segment.model.js")).default;
  const segment = await Segment.findById(abTest.segmentId);
  if (!segment) return;

  const query = {
    ...buildQuery(segment.rules, segment.logic),
    isUnsubscribed: false,
    isBounced: false,
    isValidEmail: true,
  };

  const recipients = await Contact.find(query).lean();
  const totalRecipients = recipients.length;
  if (totalRecipients === 0) return;

  const variantsCount = abTest.variants.length;
  const groupSize = Math.floor(totalRecipients / variantsCount);

  for (let i = 0; i < variantsCount; i++) {
    const variant = abTest.variants[i];
    const startIndex = i * groupSize;
    const endIndex = (i === variantsCount - 1) ? totalRecipients : (i + 1) * groupSize;
    const groupRecipients = recipients.slice(startIndex, endIndex);

    const campaign = await Campaign.findById(variant.campaignId);
    if (campaign) {
      // Process this group
      for (const recipient of groupRecipients) {
        try {
          const trackingId = await createTrackingRecord(campaign._id, recipient._id, recipient.email);
          let html = personalizeContent(campaign.htmlContent, recipient);
          html = addTrackingPixel(html, trackingId);

          if (campaign.emailBlocks) {
            for (const block of campaign.emailBlocks) {
              if (block.type === "product") {
                html = await injectProductWidget(html, block.settings);
              }
            }
          }

          await sendEmail(recipient.email, campaign.subject, html, null, { trackingId });
          campaign.stats.sent++;
        } catch (err) {
          campaign.stats.bounces++;
        }
      }
      campaign.status = "sent";
      await campaign.save();
    }
  }

  abTest.status = "completed";
  abTest.completedAt = new Date();
  await abTest.save();
};

const startCampaignWorker = () => {
  setInterval(async () => {
    try {
      // Process regular campaigns
      const campaigns = await Campaign.find({
        status: "scheduled",
        scheduledAt: { $lte: new Date() },
      });

      for (const campaign of campaigns) {
        await processCampaign(campaign);
      }

      // Process A/B tests
      const abTests = await ABTest.find({
        status: "running",
        startedAt: { $lte: new Date() },
      });

      for (const abTest of abTests) {
        await processABTest(abTest);
      }
    } catch (err) {
      console.error("Worker interval error:", err);
    }
  }, 30000);
};

export default startCampaignWorker;