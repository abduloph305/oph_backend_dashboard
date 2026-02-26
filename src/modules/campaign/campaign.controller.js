import Campaign from "./campaign.model.js";
// import EmailTemplate from "./emailtemplate.model.js";
import EmailTemplate from "../template/emailtemplate.model.js";
import ABTest from "./abtest.model.js";
import * as CampaignService from "./campaign.service.js";

export const createCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.create({
      ...req.body,
      createdBy: req.user?.id,
    });
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
};

export const listCampaigns = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const campaigns = await Campaign.find(query)
      .populate("segmentId", "name")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Campaign.countDocuments(query);

    res.json({
      data: campaigns,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

export const getCampaign = async (req, res, next) => {
  try {
    const campaign = await CampaignService.getCampaignDetails(req.params.id);
    res.json(campaign);
  } catch (err) {
    next(err);
  }
};

export const updateCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(campaign);
  } catch (err) {
    next(err);
  }
};

export const deleteCampaign = async (req, res, next) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: "Campaign deleted" });
  } catch (err) {
    next(err);
  }
};

export const scheduleCampaign = async (req, res, next) => {
  try {
    const { scheduledAt } = req.body;
    const result = await CampaignService.queueCampaignForSend(req.params.id, scheduledAt);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Send campaign immediately
export const sendCampaignNow = async (req, res, next) => {
  try {
    const result = await CampaignService.sendCampaignNow(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Pause campaign
export const pauseCampaign = async (req, res, next) => {
  try {
    const campaign = await CampaignService.pauseCampaign(req.params.id);
    res.json(campaign);
  } catch (err) {
    next(err);
  }
};

// Resume campaign
export const resumeCampaign = async (req, res, next) => {
  try {
    const campaign = await CampaignService.resumeCampaign(req.params.id);
    res.json(campaign);
  } catch (err) {
    next(err);
  }
};

// Get campaign analytics
export const getCampaignAnalytics = async (req, res, next) => {
  try {
    const analytics = await CampaignService.getCampaignAnalytics(req.params.id);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
};

// Clone campaign
export const cloneCampaign = async (req, res, next) => {
  try {
    const { name } = req.body;
    const cloned = await CampaignService.cloneCampaign(req.params.id, name);
    res.status(201).json(cloned);
  } catch (err) {
    next(err);
  }
};

// Save as template
export const saveAsTemplate = async (req, res, next) => {
  try {
    const { templateName } = req.body;
    const template = await CampaignService.saveAsTemplate(req.params.id, templateName);
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
};

// Get templates
export const getTemplates = async (req, res, next) => {
  try {
    const templates = await CampaignService.getCampaignTemplates();
    res.json(templates);
  } catch (err) {
    next(err);
  }
};

// Load template into campaign
export const loadTemplate = async (req, res, next) => {
  try {
    const { templateId } = req.body;
    const campaign = await CampaignService.loadTemplateIntoCampaign(req.params.id, templateId);
    res.json(campaign);
  } catch (err) {
    next(err);
  }
};

// A/B Testing endpoints
export const createABTest = async (req, res, next) => {
  try {
    const abTest = await ABTest.create({
      ...req.body,
      createdBy: req.user?.id,
    });
    res.status(201).json(abTest);
  } catch (err) {
    next(err);
  }
};

export const listABTests = async (req, res, next) => {
  try {
    const abTests = await ABTest.find().populate("variants.campaignId").sort({ createdAt: -1 });
    res.json(abTests);
  } catch (err) {
    next(err);
  }
};

export const getABTest = async (req, res, next) => {
  try {
    const abTest = await ABTest.findById(req.params.id).populate("variants.campaignId");
    res.json(abTest);
  } catch (err) {
    next(err);
  }
};

export const getABTestPerformance = async (req, res, next) => {
  try {
    const performance = await CampaignService.getABTestPerformance(req.params.id);
    res.json(performance);
  } catch (err) {
    next(err);
  }
};

export const startABTest = async (req, res, next) => {
  try {
    const abTest = await ABTest.findByIdAndUpdate(
      req.params.id,
      {
        status: "running",
        startedAt: new Date(),
      },
      { new: true }
    );
    res.json(abTest);
  } catch (err) {
    next(err);
  }
};

export const completeABTest = async (req, res, next) => {
  try {
    const { winnerId, improvementPercentage } = req.body;

    const abTest = await ABTest.findByIdAndUpdate(
      req.params.id,
      {
        status: "completed",
        completedAt: new Date(),
        winnerId,
        "winningStats.improvement": improvementPercentage,
      },
      { new: true }
    );

    res.json(abTest);
  } catch (err) {
    next(err);
  }
};