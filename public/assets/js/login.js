document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const passwordInput = document.getElementById("password");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const forgotPasswordLink = document.getElementById("forgotPassword");
  const registerLink = document.getElementById("registerLink");
  const roleButtons = document.querySelectorAll(".role-selector .btn");
  const loginBtn = document.querySelector('#loginForm button[type="submit"]');
  const smsLoginBtn = document.getElementById("smsLoginBtn");
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const facebookLoginBtn = document.getElementById("facebookLoginBtn");

  // State
  let currentRole = "customer";
  let isProcessing = false;

  // Initialize form
  initForm();

  // Event Listeners
  roleButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      setActiveRole(this.dataset.role);
    });
  });

  togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
  forgotPasswordLink.addEventListener("click", handleForgotPassword);
  registerLink.addEventListener("click", navigateToRegister);
  loginForm.addEventListener("submit", handleLogin);

  // Social login handlers
  if (smsLoginBtn) smsLoginBtn.addEventListener("click", handleSMSLogin);
  if (googleLoginBtn)
    googleLoginBtn.addEventListener("click", handleGoogleLogin);
  if (facebookLoginBtn)
    facebookLoginBtn.addEventListener("click", handleFacebookLogin);

  // Functions
  function initForm() {
    // Set default role
    setActiveRole(currentRole);

    // Auto-focus first input
    if (emailInput) emailInput.focus();

    // Initialize phone input formatting
    if (phoneInput) {
      phoneInput.addEventListener("input", formatPhoneNumber);
    }
  }

  function setActiveRole(role) {
    currentRole = role;
    roleButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.role === role);
    });

    // Update form based on role if needed
    updateFormForRole(role);
  }

  function updateFormForRole(role) {
    // You can customize form behavior based on role
    console.log(`Updated form for ${role} role`);
  }

  function togglePasswordVisibility() {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    const icon = togglePasswordBtn.querySelector("i");
    icon.classList.toggle("fa-eye", !isPassword);
    icon.classList.toggle("fa-eye-slash", isPassword);
  }

  function formatPhoneNumber(e) {
    // Format Ethiopian phone numbers (remove any non-digit and add +251 prefix)
    let value = e.target.value.replace(/\D/g, "");
    if (value.startsWith("0")) {
      value = "251" + value.substring(1);
    }
    e.target.value = value;
  }

  async function handleLogin(e) {
    e.preventDefault();

    if (isProcessing) return;
    isProcessing = true;
    setLoadingState(true);

    // Validate inputs
    const email = emailInput ? emailInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const password = passwordInput.value.trim();

    if (!password || (!email && !phone)) {
      showError("Please fill in all required fields");
      setLoadingState(false);
      isProcessing = false;
      return;
    }

    try {
      // Prepare login data
      const loginData = {
        [email ? "email" : "phone"]: email || phone,
        password,
        role: currentRole,
      };

      // Call login API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token (in real app, you might use HttpOnly cookies)
      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }

      // Redirect to appropriate dashboard
      window.location.href = data.redirectTo || getDashboardRoute(currentRole);
    } catch (error) {
      showError(error.message);
      console.error("Login error:", error);
    } finally {
      setLoadingState(false);
      isProcessing = false;
    }
  }

  function handleForgotPassword(e) {
    e.preventDefault();
    // Show forgot password modal or redirect
    const modal = new bootstrap.Modal(
      document.getElementById("forgotPasswordModal")
    );
    modal.show();
  }

  function navigateToRegister(e) {
    e.preventDefault();
    window.location.href = "register.html";
  }

  function setLoadingState(isLoading) {
    loginBtn.disabled = isLoading;
    const spinner = loginBtn.querySelector(".spinner-border");
    const btnText = loginBtn.querySelector(".btn-text");

    if (spinner) {
      spinner.classList.toggle("d-none", !isLoading);
    }
    if (btnText) {
      btnText.textContent = isLoading ? "Logging in..." : "Login";
    }
  }

  function showError(message) {
    // Remove any existing error alerts
    const existingAlert = document.querySelector(".alert-danger");
    if (existingAlert) {
      existingAlert.remove();
    }

    // Create and show new error alert
    const alertDiv = document.createElement("div");
    alertDiv.className = "alert alert-danger mt-3";
    alertDiv.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
        `;

    loginForm.appendChild(alertDiv);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  }

  function getDashboardRoute(role) {
    switch (role) {
      case "customer":
        return "customer.html";
      case "vendor":
        return "vendor.html";
      case "rider":
        return "rider.html";
      case "dispatcher":
        return "dispatcher.html";
      case "admin":
        return "admin.html";
      default:
        return "customer.html";
    }
  }

  // Social login handlers (stubs - implement based on your auth provider)
  async function handleSMSLogin() {
    try {
      // Implement SMS login logic
      const phone = prompt("Please enter your phone number:");
      if (!phone) return;

      const response = await fetch("/api/auth/sms-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "SMS login failed");
      }

      // Show verification modal
      const modal = new bootstrap.Modal(
        document.getElementById("smsVerificationModal")
      );
      modal.show();
    } catch (error) {
      showError(error.message);
    }
  }

  function handleGoogleLogin() {
    // Redirect to Google OAuth endpoint
    window.location.href = "/api/auth/google";
  }

  function handleFacebookLogin() {
    // Redirect to Facebook OAuth endpoint
    window.location.href = "/api/auth/facebook";
  }

  // Token verification on page load (if token exists)
  function verifyToken() {
    const token = localStorage.getItem("authToken");
    if (token) {
      // You might want to verify token validity with backend
      // and redirect to dashboard if valid
      console.log("Token exists, checking validity...");
    }
  }

  // Initial token check
  verifyToken();
});
