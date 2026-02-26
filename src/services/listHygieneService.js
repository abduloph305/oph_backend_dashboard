import Contact from "../modules/contact/contact.model.js";

/**
 * Remove duplicate contacts (keep most recent)
 */
export const removeDuplicates = async (field = "email") => {
  try {
    const duplicates = await Contact.aggregate([
      {
        $group: {
          _id: `$${field}`,
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          latestId: { $max: "$_id" },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ]);

    let deletedCount = 0;

    for (const dup of duplicates) {
      // Keep the latest, delete others
      const idsToDelete = dup.ids.filter((id) => id.toString() !== dup.latestId.toString());

      const result = await Contact.deleteMany({ _id: { $in: idsToDelete } });
      deletedCount += result.deletedCount;
    }

    return {
      success: true,
      duplicatesFound: duplicates.length,
      deletedCount,
    };
  } catch (error) {
    console.error("Duplicate removal error:", error);
    throw error;
  }
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Mark invalid emails
 */
export const markInvalidEmails = async () => {
  try {
    const result = await Contact.updateMany(
      {
        email: {
          $regex: /^[^\w\.-]|[^\w\.\-@]|[^\s@]+(?:[^\s@]*[^\s@]+)?@(?:[^\s@]*[^\s@]+|$)/,
        },
      },
      { $set: { isValidEmail: false } }
    );

    return {
      success: true,
      updated: result.modifiedCount,
    };
  } catch (error) {
    console.error("Email validation error:", error);
    throw error;
  }
};

/**
 * Add to bounce suppression list
 */
export const addToBounceList = async (emails) => {
  try {
    const result = await Contact.updateMany(
      { email: { $in: emails } },
      {
        $set: {
          isBounced: true,
          subscriptionStatus: "bounced",
        },
      }
    );

    return {
      success: true,
      updated: result.modifiedCount,
    };
  } catch (error) {
    console.error("Bounce list update error:", error);
    throw error;
  }
};

/**
 * Add to unsubscribe list
 */
export const addToUnsubscribeList = async (emails) => {
  try {
    const result = await Contact.updateMany(
      { email: { $in: emails } },
      {
        $set: {
          isUnsubscribed: true,
          subscriptionStatus: "unsubscribed",
        },
      }
    );

    return {
      success: true,
      updated: result.modifiedCount,
    };
  } catch (error) {
    console.error("Unsubscribe list update error:", error);
    throw error;
  }
};

/**
 * Get list hygiene report
 */
export const getListHygieneReport = async () => {
  try {
    const total = await Contact.countDocuments();

    const report = {
      total,
      valid: await Contact.countDocuments({ isValidEmail: true }),
      invalid: await Contact.countDocuments({ isValidEmail: false }),
      bounced: await Contact.countDocuments({ isBounced: true }),
      unsubscribed: await Contact.countDocuments({ isUnsubscribed: true }),
      subscribed: await Contact.countDocuments({
        isValidEmail: true,
        isBounced: false,
        isUnsubscribed: false,
      }),
    };

    report.healthScore = ((report.valid - report.bounced - report.unsubscribed) / (total || 1)) * 100;

    return report;
  } catch (error) {
    console.error("Hygiene report error:", error);
    throw error;
  }
};

/**
 * Clean list (remove duplicates, mark invalid, etc.)
 */
export const cleanList = async () => {
  try {
    const results = [];

    // Remove duplicates
    results.push(await removeDuplicates("email"));

    // Mark invalid emails
    results.push(await markInvalidEmails());

    // Suppress test emails
    results.push(await suppressTestEmails());

    // Flag inactive
    results.push(await autoFlagInactive(180)); // 180 days

    // Get updated report
    const report = await getListHygieneReport();

    return {
      success: true,
      steps: results,
      finalReport: report,
    };
  } catch (error) {
    console.error("List clean error:", error);
    throw error;
  }
};

/**
 * Suppress test and demo emails
 */
export const suppressTestEmails = async () => {
  try {
    const result = await Contact.updateMany(
      {
        email: { $regex: /test|demo|example|sample|placeholder/i },
        subscriptionStatus: { $ne: "unsubscribed" },
      },
      { $set: { subscriptionStatus: "unsubscribed", source: "auto_suppression" } }
    );

    return {
      step: "suppress_test_emails",
      updated: result.modifiedCount,
    };
  } catch (error) {
    console.error("Suppression error:", error);
    throw error;
  }
};

/**
 * Auto-flag inactive contacts
 */
export const autoFlagInactive = async (days = 180) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await Contact.updateMany(
      {
        lastActivityDate: { $lt: cutoffDate },
        subscriptionStatus: "subscribed",
      },
      { $set: { subscriptionStatus: "pending", tags: ["inactive_auto_flag"] } }
    );

    return {
      step: "auto_flag_inactive",
      updated: result.modifiedCount,
    };
  } catch (error) {
    console.error("Inactive flag error:", error);
    throw error;
  }
};

/**
 * Get inactive contacts (no engagement for X days)
 */
export const getInactiveContacts = async (inactiveDays = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    return await Contact.find({
      $or: [
        { lastActivityDate: { $lt: cutoffDate } },
        { lastActivityDate: { $exists: false } },
      ],
    }).lean();
  } catch (error) {
    console.error("Inactive contacts error:", error);
    throw error;
  }
};

/**
 * Suppress list (by patterns, domains, etc.)
 */
export const getSuppressedContactsByPattern = async (patterns = []) => {
  try {
    const regexPatterns = patterns.map((p) => new RegExp(p, "i"));

    return await Contact.find({
      email: {
        $in: regexPatterns,
      },
    }).lean();
  } catch (error) {
    console.error("Pattern suppression error:", error);
    throw error;
  }
};
