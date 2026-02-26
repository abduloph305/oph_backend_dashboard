import mongoose from "mongoose";

const emailTrackingSchema = new mongoose.Schema(
  {
    // Email tracking reference
    trackingId: {
      type: String,
      unique: true,
      index: true,
    },

    // Related data
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },

    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
    },

    email: {
      type: String,
      index: true,
    },

    // Events
    opened: {
      type: Boolean,
      default: false,
    },

    openCount: {
      type: Number,
      default: 0,
    },

    firstOpenedAt: Date,
    lastOpenedAt: Date,

    // Click tracking
    clicked: {
      type: Boolean,
      default: false,
    },

    clickCount: {
      type: Number,
      default: 0,
    },

    firstClickedAt: Date,
    lastClickedAt: Date,

    // Click details
    clickedLinks: [
      {
        url: String,
        clickCount: Number,
        timestamp: Date,
      },
    ],

    // Delivery status
    deliveryStatus: {
      type: String,
      enum: ["pending", "sent", "delivered", "bounced", "failed"],
      default: "pending",
    },

    bounceType: {
      type: String,
      enum: ["soft", "hard"],
    },

    bounceReason: String,

    // Engagement score
    engagementScore: {
      type: Number,
      default: 0,
    },

    // Suppression
    suppressed: {
      type: Boolean,
      default: false,
    },

    suppressionReason: String,

    // Conversion tracking
    converted: {
      type: Boolean,
      default: false,
    },

    conversionValue: Number,
    conversionAt: Date,

    sentAt: Date,
    expiresAt: Date,
  },
  { timestamps: true }
);

// Auto-expire tracking records after 90 days
emailTrackingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model("EmailTracking", emailTrackingSchema);
