const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

exports.sendSMS = async (to, body) => {
  try {
    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to: `+${to}`, // Ensure phone number has country code
    });
    return message;
  } catch (error) {
    console.error("Twilio error:", error);
    throw error;
  }
};
