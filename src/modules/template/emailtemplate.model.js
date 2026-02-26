import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },

        description: String,

        category: {
            type: String,
            enum: ["newsletter", "promotional", "transactional", "announcement"],
        },

        // Template blocks
        blocks: [
            {
                id: String,
                type: {
                    type: String,
                    enum: ["text", "image", "button", "divider", "product", "social", "header", "footer"],
                },
                content: String,
                settings: mongoose.Schema.Types.Mixed,
            },
        ],

        // Full HTML
        htmlContent: String,
        plainTextContent: String,

        // Thumbnail
        thumbnail: String,

        // Preview data
        previewData: mongoose.Schema.Types.Mixed,

        // Responsive settings
        isResponsive: {
            type: Boolean,
            default: true,
        },

        // Share settings
        isPublic: {
            type: Boolean,
            default: false,
        },

        usageCount: {
            type: Number,
            default: 0,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

export default mongoose.model("EmailTemplate", emailTemplateSchema);
