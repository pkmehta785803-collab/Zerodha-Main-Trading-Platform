const twilio = require("twilio");

const notificationResult = (status, message) => ({ status, message });

const normalizeSmsRecipient = (phone) => {
  const compactPhone = String(phone ?? "").trim().replace(/[\s()-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(compactPhone)) {
    return compactPhone;
  }

  const digits = compactPhone.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }
  if (/^91[6-9]\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  throw new Error("Registered mobile number must be a valid international number or 10-digit Indian mobile number.");
};

const redactSecrets = (message, secrets) =>
  secrets
    .filter((secret) => typeof secret === "string" && secret.length > 0)
    .reduce((safeMessage, secret) => safeMessage.split(secret).join("[REDACTED]"), String(message || "Unknown provider error."))
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\+\d[\d\s().-]{7,}\d/g, "[REDACTED_PHONE]")
    .slice(0, 400);

const logProviderError = (provider, error, secrets) => {
  console.error(`${provider} notification failed.`, {
    code: error?.code || "unknown",
    status: error?.status || "unknown",
    message: redactSecrets(error?.message, secrets),
  });
};

const formatOrderNotification = ({ mode, qty, name, price }) =>
  `${mode} order: ${qty} ${name} at ₹${Number(price).toFixed(2)} per share. Transaction status: SUCCESS (demo order saved; no market trade was executed).`;

const sendActivityNotification = async (user, message, options = {}) => {
  const results = {
    sms: notificationResult("not_configured", "Twilio settings are missing."),
  };
  const createTwilioClient = options.createTwilioClient || twilio;

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    TWILIO_CONTENT_SID,
  } = process.env;

  const twilioConfig = {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
  };
  const missingTwilioSettings = Object.entries(twilioConfig)
    .filter(([, value]) => !value || /^your-|^<|placeholder/i.test(value))
    .map(([key]) => key);

  if (missingTwilioSettings.length > 0) {
    results.sms = notificationResult(
      "not_configured",
      `Twilio settings are missing or placeholders: ${missingTwilioSettings.join(", ")}. Add them to backend/.env and restart the API.`
    );
    return results;
  }

  if (!/^AC[0-9a-fA-F]{32}$/.test(TWILIO_ACCOUNT_SID) ||
      !/^[0-9a-fA-F]{32}$/.test(TWILIO_AUTH_TOKEN) ||
      !/^\+[1-9]\d{7,14}$/.test(TWILIO_PHONE_NUMBER) ||
      (TWILIO_CONTENT_SID && !/^HX[0-9a-fA-F]{32}$/.test(TWILIO_CONTENT_SID))) {
    results.sms = notificationResult(
      "invalid_configuration",
      "Twilio credentials, sender number, or content template SID have an invalid format. Check backend/.env."
    );
    return results;
  }

  let recipient;
  try {
    recipient = normalizeSmsRecipient(user?.phone);
  } catch (error) {
    results.sms = notificationResult("failed", error.message);
    return results;
  }

  try {
    const client = createTwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const messageContent = TWILIO_CONTENT_SID
      ? {
          contentSid: TWILIO_CONTENT_SID,
          contentVariables: JSON.stringify({ 1: message }),
        }
      : { body: message };
    const sentMessage = await client.messages.create({
      ...messageContent,
      from: TWILIO_PHONE_NUMBER,
      to: recipient,
    });
    results.sms = notificationResult(
      "sent",
      `SMS accepted by Twilio${sentMessage?.status ? ` (status: ${sentMessage.status})` : ""}.`
    );
  } catch (error) {
    const detail = redactSecrets(error?.message, [
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
      recipient,
      user?.phone,
      user?.email,
    ]);
    logProviderError("Twilio SMS", error, [
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
      recipient,
      user?.phone,
      user?.email,
    ]);
    results.sms = notificationResult(
      "failed",
      `SMS could not be sent${error?.code ? ` (Twilio error ${error.code})` : ""}: ${detail}`
    );
  }

  return results;
};

module.exports = { formatOrderNotification, normalizeSmsRecipient, sendActivityNotification };
