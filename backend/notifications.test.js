const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");

const {
  formatOrderNotification,
  normalizeSmsRecipient,
  sendActivityNotification,
} = require("./notifications");

const twilioKeys = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "TWILIO_CONTENT_SID",
];
const originalTwilioEnv = Object.fromEntries(
  twilioKeys.map((key) => [key, process.env[key]])
);

const configureTwilio = () => {
  process.env.TWILIO_ACCOUNT_SID = `AC${"a".repeat(32)}`;
  process.env.TWILIO_AUTH_TOKEN = "b".repeat(32);
  process.env.TWILIO_PHONE_NUMBER = "+14155550123";
  delete process.env.TWILIO_CONTENT_SID;
};

afterEach(() => {
  twilioKeys.forEach((key) => {
    if (originalTwilioEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalTwilioEnv[key];
    }
  });
});

test("normalizes registered Indian phone numbers to E.164", () => {
  assert.equal(normalizeSmsRecipient("9876543210"), "+919876543210");
  assert.equal(normalizeSmsRecipient("919876543210"), "+919876543210");
  assert.equal(normalizeSmsRecipient("+91 98765-43210"), "+919876543210");
  assert.throws(() => normalizeSmsRecipient("12345"), /valid international number/);
});

test("includes transaction details and demo success status in the SMS", () => {
  const message = formatOrderNotification({
    mode: "SELL",
    qty: 3,
    name: "INFY",
    price: 1500,
  });

  assert.match(message, /SELL order/);
  assert.match(message, /3 INFY/);
  assert.match(message, /₹1500\.00/);
  assert.match(message, /Transaction status: SUCCESS/);
});

test("sends an order SMS to the logged-in user's registered mobile number", async () => {
  configureTwilio();
  let sentPayload;

  const result = await sendActivityNotification(
    { phone: "9876543210" },
    "BUY order: 2 INFY at ₹1500.00. Transaction status: SUCCESS.",
    {
      createTwilioClient: () => ({
        messages: {
          create: async (payload) => {
            sentPayload = payload;
            return { status: "queued" };
          },
        },
      }),
    }
  );

  assert.equal(sentPayload.from, process.env.TWILIO_PHONE_NUMBER);
  assert.equal(sentPayload.to, "+919876543210");
  assert.match(sentPayload.body, /Transaction status: SUCCESS/);
  assert.deepEqual(Object.keys(result), ["sms"]);
  assert.equal(result.sms.status, "sent");
  assert.match(result.sms.message, /queued/);
});

test("uses the configured Twilio content template for trial-account SMS", async () => {
  configureTwilio();
  process.env.TWILIO_CONTENT_SID = `HX${"c".repeat(32)}`;
  let sentPayload;

  await sendActivityNotification(
    { phone: "9876543210" },
    "Demo BUY order recorded.",
    {
      createTwilioClient: () => ({
        messages: {
          create: async (payload) => {
            sentPayload = payload;
            return { status: "queued" };
          },
        },
      }),
    }
  );

  assert.equal(sentPayload.contentSid, process.env.TWILIO_CONTENT_SID);
  assert.deepEqual(JSON.parse(sentPayload.contentVariables), {
    1: "Demo BUY order recorded.",
  });
  assert.equal("body" in sentPayload, false);
});

test("returns Twilio error code without logging credentials", async () => {
  configureTwilio();
  const credentials = [
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_PHONE_NUMBER,
  ];
  const recipient = "+919876543210";
  const email = "private@example.com";
  const originalConsoleError = console.error;
  let loggedOutput = "";
  console.error = (...args) => {
    loggedOutput += args
      .map((argument) =>
        typeof argument === "object" ? JSON.stringify(argument) : String(argument)
      )
      .join(" ");
  };

  try {
    const result = await sendActivityNotification(
      { phone: "9876543210", email },
      "SELL order status: SUCCESS.",
      {
        createTwilioClient: () => ({
          messages: {
            create: async () => {
              const error = new Error(
                `Rejected ${process.env.TWILIO_AUTH_TOKEN} for ${recipient} and ${email}`
              );
              error.code = 21608;
              error.status = 400;
              throw error;
            },
          },
        }),
      }
    );

    assert.equal(result.sms.status, "failed");
    assert.match(result.sms.message, /21608/);
    assert.match(result.sms.message, /\[REDACTED\]/);
    credentials.forEach((credential) => {
      assert.equal(loggedOutput.includes(credential), false);
    });
    assert.equal(result.sms.message.includes(process.env.TWILIO_AUTH_TOKEN), false);
    assert.equal(result.sms.message.includes(recipient), false);
    assert.equal(result.sms.message.includes(email), false);
    assert.equal(loggedOutput.includes(recipient), false);
    assert.equal(loggedOutput.includes(email), false);
    assert.match(loggedOutput, /21608/);
  } finally {
    console.error = originalConsoleError;
  }
});
