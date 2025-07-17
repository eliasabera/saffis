// Twilio credentials
const twilioAccountSid = "YOUR_TWILIO_ACCOUNT_SID";
const twilioAuthToken = "YOUR_TWILIO_AUTH_TOKEN";
const twilioPhoneNumber = "YOUR_TWILIO_PHONE_NUMBER";

// Initialize SMS functionality
document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("smsRouteBtn")) {
    document
      .getElementById("smsRouteBtn")
      .addEventListener("click", sendRouteSMS);
  }
});

// Send route directions via SMS
async function sendRouteSMS() {
  const phoneNumber = prompt("Please enter the rider's phone number:", "+251");
  if (!phoneNumber) return;

  try {
    // In a real app, you would fetch the actual route from your backend
    const response = await fetch("/api/sms/send-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber,
        message:
          "Your optimized route: 1. Start at Adama Farm, 2. Deliver to Addis Market, 3. Return to base. Total distance: 120km, ETA: 2.5 hours.",
      }),
    });

    if (!response.ok) throw new Error("Failed to send SMS");

    alert("SMS with route directions sent successfully!");
  } catch (error) {
    console.error("SMS error:", error);
    alert("Failed to send SMS. Please try again.");
  }
}

// Fallback for when Twilio is not available (simulated)
function sendFallbackSMS(phoneNumber, message) {
  console.log(`Simulated SMS to ${phoneNumber}: ${message}`);
  return { success: true };
}
