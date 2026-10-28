// A conversation's customer name can be "" (Meta couldn't give it yet: the page's token
// stopped working, or a short API error). It fills in later, after a reconnect or on
// the customer's next message.
export const UNKNOWN_CUSTOMER = 'Unknown customer';

/** The name to show for a customer: theirs, or "Unknown customer" when it's empty. */
export const customerName = (name) => (typeof name === 'string' && name.trim()) || UNKNOWN_CUSTOMER;
