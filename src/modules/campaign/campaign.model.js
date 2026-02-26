import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["broadcast", "newsletter", "promotional", "announcement", "flash_sale", "transactional"],
      default: "broadcast",
    },

    subject: String,
    previewText: String,
    htmlContent: String,
    plainTextContent: String,

    segmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Segment",
    },

    scheduledAt: Date,
    timezone: String,
    sendTimeOptimization: Boolean,

    status: {
      type: String,
      enum: ["draft", "scheduled", "processing", "sent", "paused"],
      default: "draft",
      index: true,
    },

    // A/B Testing
    abTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ABTest",
    },

    isVariant: Boolean,
    variantType: {
      type: String,
      enum: ["control", "subject_line", "content", "send_time"],
    },

    // Email builder elements
    emailBlocks: [
      {
        id: String,
        type: String,
        content: String,
        settings: mongoose.Schema.Types.Mixed,
      },
    ],

    // Product widgets
    productWidgets: [
      {
        type: {
          type: String,
          enum: ["single_product", "category", "bestseller"],
        },
        productIds: [String],
        categoryId: String,
        limit: Number,
      },
    ],

    // Personalization
    personalizationTokens: {
      type: Map,
      of: String,
    },

    stats: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opens: { type: Number, default: 0 },
      uniqueOpens: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      uniqueClicks: { type: Number, default: 0 },
      bounces: { type: Number, default: 0 },
      complaints: { type: Number, default: 0 },
      unsubscribes: { type: Number, default: 0 },
    },

    // Engagement rates
    openRate: { type: Number, default: 0 },
    clickRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Campaign", campaignSchema);