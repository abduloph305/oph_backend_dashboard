import Contact from "./contact.model.js";

/**
 * Create new contact
 */
export const createContact = async (data) => {
  return await Contact.create(data);
};

/**
 * Update contact
 */
export const updateContact = async (id, data) => {
  return await Contact.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

/**
 * Delete contact
 */
export const deleteContact = async (id) => {
  return await Contact.findByIdAndDelete(id);
};

/**
 * Get contact by ID
 */
export const getContactById = async (id) => {
  return await Contact.findById(id);
};

/**
 * Get contacts with pagination and filtering
 */
export const getContacts = async (queryParams) => {
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 20;
  const { search, tags, status } = queryParams;

  const skip = (page - 1) * limit;

  let query = {};

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by tags
  if (tags) {
    const tagArray = tags.split(",");
    query.tags = { $in: tagArray };
  }

  // Filter by subscription status
  if (status) {
    query.subscriptionStatus = status;
  }

  const contacts = await Contact.find(query)
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Contact.countDocuments(query);

  return {
    data: contacts,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Bulk update contacts
 */
export const bulkUpdateContacts = async (ids, updateData) => {
  const result = await Contact.updateMany(
    { _id: { $in: ids } },
    { $set: updateData }
  );

  return {
    modifiedCount: result.modifiedCount,
    matchedCount: result.matchedCount,
  };
};

/**
 * Bulk delete contacts
 */
export const bulkDeleteContacts = async (ids) => {
  const result = await Contact.deleteMany({ _id: { $in: ids } });

  return {
    deletedCount: result.deletedCount,
  };
};

/**
 * Search contacts
 */
export const searchContacts = async (query, limit = 10) => {
  return await Contact.find({
    $or: [
      { name: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ],
  })
    .limit(limit)
    .lean();
};

/**
 * Get contacts by tag
 */
export const getContactsByTag = async (tag) => {
  return await Contact.find({ tags: tag });
};

/**
 * Get contacts by subscription status
 */
export const getContactsByStatus = async (status) => {
  return await Contact.find({ subscriptionStatus: status });
};

/**
 * Update contact engagement
 */
export const updateContactEngagement = async (contactId, engagementData) => {
  return await Contact.findByIdAndUpdate(
    contactId,
    {
      $inc: engagementData,
      lastEmailEngagementDate: new Date(),
    },
    { new: true }
  );
};

/**
 * Update contact purchase info
 */
export const updateContactPurchase = async (contactId, purchaseData) => {
  const contact = await Contact.findById(contactId);

  const updatedData = {
    lastOrderDate: new Date(),
    lastPurchaseValue: purchaseData.amount || 0,
    purchaseCount: (contact.purchaseCount || 0) + 1,
    totalSpent: (contact.totalSpent || 0) + (purchaseData.amount || 0),
  };

  // Update average order value
  updatedData.averageOrderValue = updatedData.totalSpent / updatedData.purchaseCount;

  return await Contact.findByIdAndUpdate(contactId, updatedData, { new: true });
};