document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const registerForm = document.getElementById("registerForm");
  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const termsCheckbox = document.getElementById("termsAgreement");
  const roleButtons = document.querySelectorAll(".role-selector .btn");
  const nextStepBtn = document.getElementById("nextStep1");
  const prevStepBtn = document.getElementById("prevStep2");
  const submitBtn = document.getElementById("submitRegister");
  const passwordStrengthBar = document.getElementById("passwordStrength");
  const requirementItems = {
    length: document.getElementById("lengthReq"),
    number: document.getElementById("numberReq"),
    upper: document.getElementById("upperReq"),
    special: document.getElementById("specialReq"),
  };

  // State
  let currentStep = 1;
  let currentRole = "customer";
  let isProcessing = false;

  // Initialize form
  initForm();

  // Event Listeners
  roleButtons.forEach((button) => {
    button.addEventListener("click", function () {
      currentRole = this.dataset.role;
      updateRoleSelection();
      document.getElementById("userRole").value = currentRole;
    });
  });

  nextStepBtn.addEventListener("click", goToStep2);
  prevStepBtn.addEventListener("click", goToStep1);
  togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
  passwordInput.addEventListener("input", checkPasswordStrength);
  confirmPasswordInput.addEventListener("input", validatePasswordMatch);
  registerForm.addEventListener("submit", handleRegistration);

  // Functions
  function initForm() {
    updateRoleSelection();
    phoneInput.addEventListener("input", formatPhoneNumber);
  }

  function updateRoleSelection() {
    roleButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.role === currentRole);
    });
  }

  function formatPhoneNumber(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 9) value = value.substring(0, 9);
    e.target.value = value;
  }

  function togglePasswordVisibility() {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    confirmPasswordInput.type = isPassword ? "text" : "password";
    const icon = togglePasswordBtn.querySelector("i");
    icon.classList.toggle("fa-eye", !isPassword);
    icon.classList.toggle("fa-eye-slash", isPassword);
  }

  function checkPasswordStrength() {
    const password = passwordInput.value;
    let strength = 0;

    // Check requirements
    const hasLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // Update requirement indicators
    requirementItems.length.classList.toggle("valid", hasLength);
    requirementItems.number.classList.toggle("valid", hasNumber);
    requirementItems.upper.classList.toggle("valid", hasUpper);
    requirementItems.special.classList.toggle("valid", hasSpecial);

    // Calculate strength
    if (hasLength) strength += 25;
    if (hasNumber) strength += 25;
    if (hasUpper) strength += 25;
    if (hasSpecial) strength += 25;

    // Update strength bar
    passwordStrengthBar.style.width = `${strength}%`;
    passwordStrengthBar.style.backgroundColor = getStrengthColor(strength);
  }

  function getStrengthColor(strength) {
    if (strength < 50) return "#dc3545"; // Red
    if (strength < 75) return "#fd7e14"; // Orange
    return "#198754"; // Green
  }

  function validatePasswordMatch() {
    const match = passwordInput.value === confirmPasswordInput.value;
    confirmPasswordInput.classList.toggle(
      "is-invalid",
      !match && confirmPasswordInput.value.length > 0
    );
    confirmPasswordInput.classList.toggle(
      "is-valid",
      match && confirmPasswordInput.value.length > 0
    );
  }

  function goToStep1() {
    currentStep = 1;
    updateStepUI();
  }

  function goToStep2() {
    currentStep = 2;
    updateStepUI();
  }

  function updateStepUI() {
    // Hide all steps
    document.querySelectorAll(".form-step").forEach((step) => {
      step.classList.remove("active");
    });

    // Show current step
    document.getElementById(`step${currentStep}`).classList.add("active");

    // Update progress bar
    document.getElementById("registrationProgress").style.width = `${
      (currentStep / 2) * 100
    }%`;
  }

  async function handleRegistration(e) {
    e.preventDefault();

    if (isProcessing) return;
    isProcessing = true;
    setLoadingState(true);

    // Validate form
    if (!validateForm()) {
      isProcessing = false;
      setLoadingState(false);
      return;
    }

    try {
      // Prepare registration data
      const userData = {
        name: fullNameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: `251${phoneInput.value.trim()}`,
        password: passwordInput.value.trim(),
        role: currentRole,
      };

      // Call registration API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Registration successful - move to success step
      currentStep = 3;
      updateStepUI();

      // In a real app, you might automatically log the user in
      // or send them a verification email/SMS
    } catch (error) {
      showError(error.message);
      console.error("Registration error:", error);
    } finally {
      setLoadingState(false);
      isProcessing = false;
    }
  }

  function validateForm() {
    let isValid = true;

    // Validate name
    if (fullNameInput.value.trim().length < 2) {
      fullNameInput.classList.add("is-invalid");
      isValid = false;
    } else {
      fullNameInput.classList.remove("is-invalid");
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
      emailInput.classList.add("is-invalid");
      isValid = false;
    } else {
      emailInput.classList.remove("is-invalid");
    }

    // Validate phone
    if (phoneInput.value.trim().length !== 9) {
      phoneInput.classList.add("is-invalid");
      isValid = false;
    } else {
      phoneInput.classList.remove("is-invalid");
    }

    // Validate password match
    if (passwordInput.value !== confirmPasswordInput.value) {
      confirmPasswordInput.classList.add("is-invalid");
      isValid = false;
    }

    // Validate terms
    if (!termsCheckbox.checked) {
      termsCheckbox.classList.add("is-invalid");
      isValid = false;
    } else {
      termsCheckbox.classList.remove("is-invalid");
    }

    return isValid;
  }

  function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    const spinner = submitBtn.querySelector(".spinner-border");
    const btnText = submitBtn.querySelector(".btn-text");

    if (spinner) spinner.classList.toggle("d-none", !isLoading);
    if (btnText)
      btnText.textContent = isLoading ? "Processing..." : "Create Account";
  }

  function showError(message) {
    // Remove existing errors
    const existingAlert = document.querySelector(".alert-danger");
    if (existingAlert) existingAlert.remove();

    // Create error alert
    const alertDiv = document.createElement("div");
    alertDiv.className = "alert alert-danger mt-3";
    alertDiv.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
        `;

    registerForm.appendChild(alertDiv);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  }
});
