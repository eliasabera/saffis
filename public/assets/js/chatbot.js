// Gemini API Key


// Initialize chatbot
document.addEventListener("DOMContentLoaded", function () {
  const chatMessages = document.getElementById("chatbotMessages");
  const chatInput = document.getElementById("chatbotInput");
  const sendButton = document.getElementById("sendChatbotMessage");

  // Supported languages
  const languages = {
    am: "Amharic",
    om: "Afaan Oromo",
    ti: "Tigrinya",
    en: "English",
  };

  let currentLanguage = "en";
  let conversationHistory = [];

  // Add language selector
  const languageSelector = document.createElement("div");
  languageSelector.className = "d-flex justify-content-center mb-3";
  languageSelector.innerHTML = `
        <div class="btn-group btn-group-sm">
            ${Object.entries(languages)
              .map(
                ([code, name]) => `
                <button type="button" class="btn btn-outline-primary ${
                  currentLanguage === code ? "active" : ""
                }" 
                        data-lang="${code}">${name}</button>
            `
              )
              .join("")}
        </div>
    `;
  chatMessages.parentNode.insertBefore(
    languageSelector,
    chatMessages.nextSibling
  );

  // Language selection handler
  languageSelector.addEventListener("click", function (e) {
    if (e.target.tagName === "BUTTON") {
      currentLanguage = e.target.dataset.lang;
      Array.from(languageSelector.querySelectorAll("button")).forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.lang === currentLanguage);
      });
      addBotMessage(
        `Language changed to ${languages[currentLanguage]}. How can I help you?`
      );
    }
  });

  // Send message handler
  function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
      addUserMessage(message);
      chatInput.value = "";
      processUserMessage(message);
    }
  }

  // Event listeners
  sendButton.addEventListener("click", sendMessage);
  chatInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
  });

  // Add user message to chat
  function addUserMessage(text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message user-message mb-2";
    messageDiv.innerHTML = `
            <div class="message-content bg-primary text-black p-3 rounded">
                <p class="mb-0">${text}</p>
            </div>
            <small class="text-muted">You • Just now</small>
        `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add to conversation history
    conversationHistory.push({
      role: "user",
      parts: [{ text: text }],
    });
  }

  // Add bot message to chat
  function addBotMessage(text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message bot-message mb-2";
    messageDiv.innerHTML = `
            <div class="message-content bg-light p-3 rounded">
                <p class="mb-0">${text}</p>
            </div>
            <small class="text-muted">RouteBot • Just now</small>
        `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add to conversation history
    conversationHistory.push({
      role: "model",
      parts: [{ text: text }],
    });
  }

  // Process user message with Gemini API
  async function processUserMessage(message) {
    try {
      // Show typing indicator
      const typingIndicator = document.createElement("div");
      typingIndicator.className = "chat-message bot-message mb-2";
      typingIndicator.innerHTML = `
                <div class="message-content bg-light p-3 rounded">
                    <p class="mb-0"><i class="fas fa-ellipsis-h"></i> RouteBot is typing...</p>
                </div>
            `;
      chatMessages.appendChild(typingIndicator);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Prepare the conversation context
      const systemPrompt = {
        role: "user",
        parts: [
          {
            text: `You are RouteBot, a friendly and helpful delivery assistant for Saffis Delivery in Ethiopia. 
                          Respond in ${
                            languages[currentLanguage]
                          } unless the user requests another language. 
                          Keep responses concise but helpful. Saffis Delivery specializes in agricultural product 
                          transportation across Ethiopia, serving farmers, vendors, and customers. 
                          Current conversation context: ${JSON.stringify(
                            conversationHistory.slice(-4)
                          )}`,
          },
        ],
      };

      const messages = [systemPrompt, ...conversationHistory.slice(-6)];

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: messages,
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
              maxOutputTokens: 500,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_ONLY_HIGH",
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_ONLY_HIGH",
              },
            ],
          }),
        }
      );

      // Remove typing indicator
      chatMessages.removeChild(typingIndicator);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to get response from AI"
        );
      }

      const data = await response.json();
      const botResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I couldn't process your request. Please try again.";

      addBotMessage(botResponse);
    } catch (error) {
      console.error("Chatbot error:", error);

      // Fallback to predefined responses if API fails
      const lowerMessage = message.toLowerCase();
      const predefined = getPredefinedResponse(lowerMessage);

      if (predefined) {
        addBotMessage(predefined);
      } else {
        addBotMessage(
          "I'm having trouble connecting. Please check your internet and try again later."
        );
      }
    }
  }

  // Get predefined response if available
  function getPredefinedResponse(message) {
    const responses =
      predefinedResponses[currentLanguage] || predefinedResponses["en"];

    // Check for exact matches
    if (responses[message]) {
      return responses[message];
    }

    // Check for partial matches
    for (const [key, response] of Object.entries(responses)) {
      if (message.includes(key)) {
        return response;
      }
    }

    return null;
  }

  // Predefined responses for common questions
  const predefinedResponses = {
    en: {
      hello:
        "Hello! 👋 I'm RouteBot, your Saffis Delivery assistant. How can I help you today?",
      hi: "Hi there! 😊 How can I assist with your delivery needs?",
      track:
        'To track your delivery, please provide your tracking number or check the "My Deliveries" section in the app.',
      "delivery time":
        "Delivery times depend on distance: Urban areas (1-2 days), Rural areas (3-5 days). Need a specific estimate?",
      cost: 'Delivery costs are based on distance and weight. You can get an instant quote in the "New Delivery" section.',
      thanks: "You're welcome! Is there anything else I can help you with?",
      help: "I can help with: tracking deliveries, estimating costs, finding pickup points, and more. What do you need?",
    },
    am: {
      hello:
        "ሰላም! 👋 እኔ RouteBot ነኝ፣ የSaffis Delivery ረዳትዎ። ዛሬ እንዴት ልርዳዎት እችላለሁ?",
      hi: "ሰላም! 😊 ስለ ላክዎ እንዴት ልርዳችሁ እችላለሁ?",
      track:
        'ላክዎትን ለመከታተል፣ እባክዎን የፍለጋ ቁጥርዎን ያስገቡ ወይም በመተግበሪያው ውስጥ "የእኔ ላክዎች" ክፍልን ይፈትሹ።',
      "delivery time":
        "የመላኪያ ጊዜ በርቀት የተመሠረተ ነው። የከተማ አካባቢዎች (1-2 ቀናት)፣ የገጠር አካባቢዎች (3-5 ቀናት)። የተወሰነ ግምት ይፈልጋሉ?",
      cost: 'የመላኪያ ወጪዎች በርቀት እና በክብደት የተመሠረቱ ናቸው። በ"አዲስ ላክ" ክፍል ውስጥ ፈጣን የዋጋ ግምት ማግኘት ይችላሉ።',
      thanks: "አመሰግናለሁ! ሌላ ሊረዳኝ የሚችለው ነገር አለ?",
      help: "ከሚከተሉት ጋር ልርዳችሁ እችላለሁ፡ ላክዎችን መከታተል፣ ወጪዎችን መገመት፣ የመግዛት ቦታዎችን መፈለግ፣ እና ሌሎችም። ምን ይፈልጋሉ?",
    },
  };

  // Add initial bot greeting
  setTimeout(() => {
    addBotMessage(
      "Hello! 👋 I'm RouteBot, your Saffis Delivery assistant. How can I help you today?"
    );
  }, 1000);
});
