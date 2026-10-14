const notificationStatus = (result) =>
  result?.message || "No notification status returned.";

const notificationSummary = (results) =>
  `SMS: ${notificationStatus(results?.sms)}`;

export const hasNotificationFailure = (results) =>
  !results || results.sms?.status !== "sent";

export default notificationSummary;
