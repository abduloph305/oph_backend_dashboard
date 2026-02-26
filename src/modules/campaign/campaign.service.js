import Campaign from "./campaign.model.js";
// import EmailTemplate from "./emailtemplate.model.js";
import EmailTemplate from "../template/emailtemplate.model.js";
import ABTest from "./abtest.model.js";
import Contact from "../contact/contact.model.js";
import Segment from "../segment/segment.model.js";
import EmailTracking from "../analytics/emailtracking.model.js";
import { buildComplexSegmentQuery } from "../../services/segmentationService.js";
import { sendCampaignToSegment, personalizeContent } from "../../services/emailService.js";

/**
 * Get campaign details
 */
export const getCampaignDetails = async (campaignId) => {
  return await Campaign.findById(campaignId)
    .populate("segmentId")
    .populate("abTestId")
    .populate("createdBy", "name email");
};

/**
 * Get campaign analytics
 */
export const getCampaignAnalytics = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  const trackingData = await EmailTracking.find({ campaignId }).lean();

  const analytics = {
    campaign: {
      name: campaign.name,
      status: campaign.status,
      type: campaign.type,
    },
    metrics: {
      sent: campaign.stats.sent || 0,
      delivered: campaign.stats.delivered || 0,
      opens: campaign.stats.opens || 0,
      clicks: campaign.stats.clicks || 0,
      bounces: campaign.stats.bounces || 0,
      complaints: campaign.stats.complaints || 0,
      unsubscribes: campaign.stats.unsubscribes || 0,
    },
    rates: {
      openRate: campaign.openRate || 0,
      clickRate: campaign.clickRate || 0,
      conversionRate: campaign.conversionRate || 0,
      bounceRate: ((campaign.stats.bounces / campaign.stats.sent) * 100) || 0,
    },
    engagement: {
      uniqueOpens: trackingData.filter((t) => t.opened).length,
      uniqueClicks: trackingData.filter((t) => t.clicked).length,
      avgOpenTime: calculateAvgOpenTime(trackingData),
    },
    timeline: {
      sentAt: campaign.createdAt,
      completedAt: campaign.updatedAt,
    },
  };

  return analytics;
};

/**
 * Calculate average time to open
 */
const calculateAvgOpenTime = (trackingData) => {
  const openedEmails = trackingData.filter((t) => t.firstOpenedAt);
  if (openedEmails.length === 0) return 0;

  const totalTime = openedEmails.reduce((acc, t) => {
    const sentTime = new Date(t.sentAt).getTime();
    const openTime = new Date(t.firstOpenedAt).getTime();
    return acc + (openTime - sentTime);
  }, 0);

  return Math.round(totalTime / openedEmails.length / (1000 * 60)); // minutes
};

/**
 * Clone campaign
 */
export const cloneCampaign = async (campaignId, newName) => {
  const campaign = await Campaign.findById(campaignId);

  const cloned = await Campaign.create({
    ...campaign.toObject(),
    _id: undefined,
    name: newName || `${campaign.name} - Copy`,
    status: "draft",
  });

  return cloned;
};

/**
 * Save as template
 */
export const saveAsTemplate = async (campaignId, templateName) => {
  const campaign = await Campaign.findById(campaignId);

  const template = await EmailTemplate.create({
    name: templateName,
    htmlContent: campaign.htmlContent,
    plainTextContent: campaign.plainTextContent,
    blocks: campaign.emailBlocks,
    category: campaign.type,
    createdBy: campaign.createdBy,
  });

  return template;
};

/**
 * Load template into campaign
 */
export const loadTemplateIntoCampaign = async (campaignId, templateId) => {
  const template = await EmailTemplate.findById(templateId);

  const updated = await Campaign.findByIdAndUpdate(
    campaignId,
    {
      htmlContent: template.htmlContent,
      plainTextContent: template.plainTextContent,
      emailBlocks: template.blocks,
    },
    { new: true }
  );

  return updated;
};

/**
 * Get campaign templates
 */
export const getCampaignTemplates = async () => {
  return await EmailTemplate.find().lean();
};

/**
 * Send campaign immediately
 */
export const sendCampaignNow = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);

  if (!campaign) throw new Error("Campaign not found");

  return await sendCampaignToSegment(campaignId, campaign.segmentId, false);
};

/**
 * Queue campaign for scheduled send (for job processing)
 */
export const queueCampaignForSend = async (campaignId, scheduledTime = null) => {
  const campaign = await Campaign.findById(campaignId);

  if (!campaign) throw new Error("Campaign not found");

  // This would be queued to a job processor (BullMQ, etc)
  await Campaign.findByIdAndUpdate(campaignId, {
    status: "scheduled",
    scheduledAt: scheduledTime,
  });

  return { queued: true, campaignId, scheduledAt: scheduledTime };
};

/**
 * Pause campaign sending
 */
export const pauseCampaign = async (campaignId) => {
  return await Campaign.findByIdAndUpdate(
    campaignId,
    { status: "paused" },
    { new: true }
  );
};

/**
 * Resume campaign sending
 */
export const resumeCampaign = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);

  if (campaign.status !== "paused") {
    throw new Error("Only paused campaigns can be resumed");
  }

  return await sendCampaignNow(campaignId);
};

/**
 * Get campaign performance comparison (for A/B tests)
 */
export const getABTestPerformance = async (abTestId) => {
  const abTest = await ABTest.findById(abTestId).populate("variants.campaignId");

  const performance = {
    testType: abTest.testType,
    status: abTest.status,
    variants: [],
  };

  for (const variant of abTest.variants) {
    const campaign = variant.campaignId;
    const tracking = await EmailTracking.find({ campaignId: campaign._id });

    performance.variants.push({
      label: variant.label,
      sent: campaign.stats.sent,
      opens: campaign.stats.opens,
      clicks: campaign.stats.clicks,
      openRate: ((campaign.stats.opens / campaign.stats.sent) * 100) || 0,
      clickRate: ((campaign.stats.clicks / campaign.stats.sent) * 100) || 0,
    });
  }

  return performance;
};