import mongoose from "mongoose";

const abTestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: String,

    // Test type
    testType: {
      type: String,
      enum: ["subject_line", "content", "send_time", "cta"],
      required: true,
    },

    // Related campaign
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },

    // Control and variants
    controlVariantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },

    variants: [
      {
        campaignId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Campaign",
        },
        label: String,
        description: String,
        segmentSize: Number,
        metric: String, // "open_rate" or "click_rate"
      },
    ],

    // Test settings
    testDuration: Number, // in hours
    winningMetric: {
      type: String,
      enum: ["open_rate", "click_rate", "conversion_rate"],
      default: "open_rate",
    },

    segmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Segment",
    },

    // Status
    status: {
      type: String,
      enum: ["draft", "running", "completed", "paused"],
      default: "draft",
    },

    startedAt: Date,
    completedAt: Date,

    // Winner
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },

    winningStats: {
      variantLabel: String,
      metric: Number,
      improvement: Number, // percentage
    },

    shouldAutoSend: {
      type: Boolean,
      default: false,
    },

    autoSendWinnerAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ABTest", abTestSchema);
