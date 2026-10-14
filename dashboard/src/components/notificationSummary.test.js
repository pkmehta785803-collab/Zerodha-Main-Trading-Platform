import notificationSummary, { hasNotificationFailure } from "./notificationSummary";

test("reports when the SMS notification was sent", () => {
  const results = { sms: { status: "sent", message: "SMS sent." } };

  expect(hasNotificationFailure(results)).toBe(false);
  expect(notificationSummary(results)).toBe("SMS: SMS sent.");
});

test("reports when the SMS notification was not sent", () => {
  const results = { sms: { status: "not_configured", message: "Twilio settings are missing." } };

  expect(hasNotificationFailure(results)).toBe(true);
});
