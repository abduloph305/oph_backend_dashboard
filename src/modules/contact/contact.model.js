import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],

    customAttributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    lastOrderDate: {
      type: Date,
      index: true,
    },

    totalSpent: {
      type: Number,
      default: 0,
      index: true,
    },

    cartValue: {
      type: Number,
      default: 0,
    },

    categoryInterest: [
      {
        type: String,
        index: true,
      },
    ],

    emailEngagement: {
      opens: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
    },

    couponUsage: {
      type: Number,
      default: 0,
    },

    isUnsubscribed: {
      type: Boolean,
      default: false,
      index: true,
    },

    isBounced: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastActivityDate: {
      type: Date,
      index: true,
    },

    abandonedCartValue: {
      type: Number,
      default: 0,
    },

    abandonedCartItems: {
      type: Array,
      default: [],
    },

    lastEmailEngagementDate: {
      type: Date,
      index: true,
    },

    subscriptionStatus: {
      type: String,
      enum: ["subscribed", "unsubscribed", "bounced", "pending"],
      default: "subscribed",
      index: true,
    },

    source: {
      type: String,
      trim: true,
    },

    purchaseCount: {
      type: Number,
      default: 0,
    },

    averageOrderValue: {
      type: Number,
      default: 0,
    },

    lastPurchaseValue: {
      type: Number,
      default: 0,
    },

    isValidEmail: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Contact", contactSchema);