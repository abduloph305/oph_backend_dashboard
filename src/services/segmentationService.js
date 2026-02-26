import Contact from "../modules/contact/contact.model.js";
import Segment from "../modules/segment/segment.model.js";

/**
 * Build MongoDB query from segment rules
 */
export const buildQuery = (rules = [], logic = "AND") => {
  if (!rules || rules.length === 0) return {};

  const conditions = rules.map((rule) => {
    const { field, operator, value, valueRange } = rule;

    if (!field || !operator) return null;

    switch (operator) {
      case "equals":
        return { [field]: value };

      case "notEquals":
        return { [field]: { $ne: value } };

      case "gt":
        return { [field]: { $gt: isNaN(value) ? value : Number(value) } };

      case "lt":
        return { [field]: { $lt: isNaN(value) ? value : Number(value) } };

      case "gte":
        return { [field]: { $gte: isNaN(value) ? value : Number(value) } };

      case "lte":
        return { [field]: { $lte: isNaN(value) ? value : Number(value) } };

      case "contains":
        if (Array.isArray(value)) {
          return { [field]: { $in: value } };
        }
        return { [field]: { $regex: value, $options: "i" } };

      case "notContains":
        return { [field]: { $not: { $regex: value, $options: "i" } } };

      case "exists":
        return { [field]: { $exists: true, $ne: null } };

      case "between":
        if (!valueRange) return null;
        return {
          [field]: {
            $gte: isNaN(valueRange.from) ? valueRange.from : Number(valueRange.from),
            $lte: isNaN(valueRange.to) ? valueRange.to : Number(valueRange.to),
          },
        };

      case "in":
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };

      case "nin":
        return { [field]: { $nin: Array.isArray(value) ? value : [value] } };

      case "regex":
        return { [field]: { $regex: value, $options: "i" } };

      default:
        console.warn(`Unsupported operator: ${operator}`);
        return null;
    }
  }).filter(Boolean);

  if (conditions.length === 0) return {};

  return logic === "OR" ? { $or: conditions } : { $and: conditions };
};

/**
 * Build complex nested query
 */
export const buildComplexSegmentQuery = (segment) => {
  let query = buildQuery(segment.rules, segment.logic);

  if (segment.nestedRules && segment.nestedRules.length > 0) {
    const nestedConditions = segment.nestedRules.map((nr) =>
      buildQuery(nr.rules, nr.logic)
    );

    if (segment.logic === "AND") {
      query = { $and: [query, ...nestedConditions] };
    } else {
      query = { $or: [query, ...nestedConditions] };
    }
  }

  return query;
};

/**
 * Preview segment size
 */
export const previewSegmentSize = async (rules, logic = "AND") => {
  try {
    const query = buildQuery(rules, logic);
    const count = await Contact.countDocuments(query);

    return {
      size: count,
      percentage: ((count / (await Contact.countDocuments())) * 100).toFixed(2),
    };
  } catch (error) {
    console.error("Segment preview error:", error);
    throw error;
  }
};

/**
 * Get sample contacts from segment
 */
export const getSampleContacts = async (rules, logic = "AND", limit = 10) => {
  try {
    const query = buildQuery(rules, logic);
    const contacts = await Contact.find(query).limit(limit).lean();

    return contacts;
  } catch (error) {
    console.error("Sample contacts error:", error);
    throw error;
  }
};

/**
 * Calculate segment stats
 */
export const calculateSegmentStats = async (segmentId) => {
  try {
    const segment = await Segment.findById(segmentId);
    if (!segment) throw new Error("Segment not found");

    const query = buildComplexSegmentQuery(segment);

    const contacts = await Contact.find(query).lean();

    const stats = {
      totalContacts: contacts.length,
      activeSubscribers: contacts.filter((c) => !c.isUnsubscribed && !c.isBounced).length,
      avgEngagementScore: contacts.reduce((acc, c) => acc + (c.emailEngagement.opens + c.emailEngagement.clicks), 0) / contacts.length,
      avgSpend: contacts.reduce((acc, c) => acc + c.totalSpent, 0) / contacts.length,
      lastEngagementAnalysis: {
        activeIn7Days: contacts.filter((c) => {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return c.lastEmailEngagementDate > sevenDaysAgo;
        }).length,
        activeIn30Days: contacts.filter((c) => {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return c.lastEmailEngagementDate > thirtyDaysAgo;
        }).length,
      },
    };

    return stats;
  } catch (error) {
    console.error("Segment stats error:", error);
    throw error;
  }
};

/**
 * Pre-built segments (templates)
 */
export const getPreBuiltSegments = () => {
  return [
    {
      name: "VIP Customers",
      description: "Customers with high lifetime value",
      rules: [
        {
          field: "totalSpent",
          operator: "gte",
          value: 500,
        },
      ],
    },
    {
      name: "Inactive Customers",
      description: "No activity in last 90 days",
      rules: [
        {
          field: "lastActivityDate",
          operator: "lt",
          value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    {
      name: "Abandoned Cart",
      description: "Customers with items in cart",
      rules: [
        {
          field: "abandonedCartValue",
          operator: "gt",
          value: 0,
        },
      ],
    },
    {
      name: "Recent Purchasers",
      description: "Purchased in last 30 days",
      rules: [
        {
          field: "lastOrderDate",
          operator: "gte",
          value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    {
      name: "High Engagement",
      description: "Customers who open and click emails",
      rules: [
        {
          field: "emailEngagement.opens",
          operator: "gte",
          value: 5,
        },
        {
          field: "emailEngagement.clicks",
          operator: "gte",
          value: 2,
        },
      ],
      logic: "AND",
    },
  ];
};

/**
 * Sync segment contacts (recalculate)
 */
export const syncSegment = async (segmentId) => {
  try {
    const segment = await Segment.findById(segmentId);
    if (!segment) throw new Error("Segment not found");

    const query = buildComplexSegmentQuery(segment);
    const contactCount = await Contact.countDocuments(query);

    await Segment.findByIdAndUpdate(segmentId, {
      contactCount,
      lastCalculatedAt: new Date(),
    });

    return {
      contactCount,
      lastSynced: new Date(),
    };
  } catch (error) {
    console.error("Segment sync error:", error);
    throw error;
  }
};
