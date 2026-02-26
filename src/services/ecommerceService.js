import * as ContactService from "../modules/contact/contact.service.js";
import Contact from "../modules/contact/contact.model.js";

/**
 * Handle new customer signup
 */
export const handleCustomerSignup = async (customerData) => {
    try {
        const existing = await Contact.findOne({ email: customerData.email.toLowerCase() });
        if (existing) return existing;

        return await ContactService.createContact({
            ...customerData,
            source: "ecommerce_signup",
            subscriptionStatus: "subscribed",
        });
    } catch (error) {
        console.error("Signup sync error:", error);
        throw error;
    }
};

/**
 * Handle purchase completed
 */
export const handlePurchaseCompleted = async (email, purchaseData) => {
    try {
        const contact = await Contact.findOne({ email: email.toLowerCase() });
        if (!contact) {
            // Create contact if not exists
            await handleCustomerSignup({ email, ...purchaseData.customer });
        }

        const updatedContact = await ContactService.updateContactPurchase(contact._id, {
            amount: purchaseData.totalAmount,
        });

        // Update category interests
        if (purchaseData.categories && purchaseData.categories.length > 0) {
            await Contact.findByIdAndUpdate(contact._id, {
                $addToSet: { categoryInterest: { $each: purchaseData.categories } },
            });
        }

        return updatedContact;
    } catch (error) {
        console.error("Purchase sync error:", error);
        throw error;
    }
};

/**
 * Handle cart abandonment
 */
export const handleCartAbandoned = async (email, cartData) => {
    try {
        const contact = await Contact.findOne({ email: email.toLowerCase() });
        if (!contact) return null;

        return await Contact.findByIdAndUpdate(
            contact._id,
            {
                abandonedCartValue: cartData.totalValue,
                abandonedCartItems: cartData.items,
                lastActivityDate: new Date(),
            },
            { new: true }
        );
    } catch (error) {
        console.error("Cart abandonment sync error:", error);
        throw error;
    }
};

/**
 * Handle customer activity (e.g. login, page view)
 */
export const handleCustomerActivity = async (email, activityType) => {
    try {
        return await Contact.findOneAndUpdate(
            { email: email.toLowerCase() },
            { lastActivityDate: new Date() },
            { new: true }
        );
    } catch (error) {
        console.error("Activity sync error:", error);
        throw error;
    }
};
