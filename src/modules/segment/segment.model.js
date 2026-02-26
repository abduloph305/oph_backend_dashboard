import mongoose from "mongoose";

const segmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: String,

    // Dynamic rules for segmentation
    rules: [
      {
        field: String,
        operator: {
          type: String,
          enum: [
            "equals",
            "notEquals",
            "gt",
            "lt",
            "gte",
            "lte",
            "contains",
            "notContains",
            "exists",
            "between",
            "in",
            "nin",
            "regex",
          ],
        },
        value: mongoose.Schema.Types.Mixed,
        valueRange: {
          from: mongoose.Schema.Types.Mixed,
          to: mongoose.Schema.Types.Mixed,
        },
      },
    ],

    // AND / OR logic
    logic: {
      type: String,
      enum: ["AND", "OR"],
      default: "AND",
    },

    // Nested logic for complex conditions
    nestedRules: [
      {
        rules: Array,
        logic: String,
      },
    ],

    // Contact count in segment
    contactCount: {
      type: Number,
      default: 0,
    },

    // Last calculation
    lastCalculatedAt: Date,

    // Sync settings
    autoSync: {
      type: Boolean,
      default: true,
    },

    syncFrequency: {
      type: String,
      enum: ["realtime", "hourly", "daily"],
      default: "daily",
    },

    // Active/Inactive
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Segment", segmentSchema);