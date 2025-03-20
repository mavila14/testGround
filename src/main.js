/***************************************************************
 * main.js
 *
 * Main application logic with enhanced functionality matching
 * the Streamlit version's capabilities.
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {
    // Access helper functions from the global object
    const {
      callGeminiAPI,
      computePDS,
      getRecommendation,
      createRadarChart,
      createPdsGauge,
      Config
    } = window.AppHelpers || {};
  
    // Grab references to key elements
    const navBasicBtn = document.getElementById("nav-basic");
    const navAdvancedBtn = document.getElementById("nav-advanced");
    const basicSection = document.getElementById("basic-section");
    const advancedSection = document.getElementById("advanced-section");
    const basicForm = document.getElementById("basic-form");
    const advancedForm = document.getElementById("advanced-form");
    const basicResultDiv = document.getElementById("basic-result");
    const advancedResultDiv = document.getElementById("advanced-result");
    const menuToggle = document.getElementById("menu-toggle");
  
    // Setup mobile menu toggle
    if (menuToggle) {
      menuToggle.addEventListener("click", () => {
        document.body.classList.toggle("mobile-menu-open");
      });
    }
  
    // Initialize tooltips
    initializeTooltips();
  
    // Navigation button click events
    if (navBasicBtn) {
      navBasicBtn.addEventListener("click", () => {
        navBasicBtn.classList.add("active");
        navAdvancedBtn.classList.remove("active");
        basicSection.classList.remove("hidden");
        advancedSection.classList.add("hidden");
        // Animate transition
        basicSection.style.animation = "fadeIn 0.3s";
        setTimeout(() => {
          basicSection.style.animation = "";
        }, 300);
      });
    }
  
    if (navAdvancedBtn) {
      navAdvancedBtn.addEventListener("click", () => {
        navBasicBtn.classList.remove("active");
        navAdvancedBtn.classList.add("active");
        basicSection.classList.add("hidden");
        advancedSection.classList.remove("hidden");
        // Animate transition
        advancedSection.style.animation = "fadeIn 0.3s";
        setTimeout(() => {
          advancedSection.style.animation = "";
        }, 300);
      });
    }
  
    // Initialize the forms with appropriate validation
    if (basicForm) initializeFormValidation(basicForm);
    if (advancedForm) initializeFormValidation(advancedForm);
  
    /**************************************************
     * BASIC FORM SUBMISSION - Matches Streamlit version
     **************************************************/
    if (basicForm) {
      basicForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // prevent page reload
  
        // Validate form
        if (!basicForm.checkValidity()) {
          showValidationMessages(basicForm);
          return;
        }
  
        // Collect user input
        const itemName =
          document.getElementById("basic-item-name").value.trim() || "Unnamed";
        const itemCost =
          parseFloat(document.getElementById("basic-item-cost").value) || 0;
  
        // Show loading state
        basicResultDiv.innerHTML = renderLoadingState();
  
        // Scroll to results
        setTimeout(() => {
          basicResultDiv.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
  
        try {
          // Using the same logic as the Streamlit version for calculating defaults
          const leftoverIncome = Math.max(1000, itemCost * 2);
          const hasHighInterestDebt = "No";
          const mainFinancialGoal = "Save for emergencies";
          const purchaseUrgency = "Mixed";
  
          // Call the Gemini API
          const factors = await callGeminiAPI({
            leftoverIncome,
            hasHighInterestDebt,
            mainFinancialGoal,
            purchaseUrgency,
            itemName,
            itemCost,
            extraContext: ""
          });
  
          // Compute PDS and recommendation
          const pds = computePDS(factors);
          const { text: recText, cssClass: recClass } = getRecommendation(pds);
  
          // Render the result
          basicResultDiv.innerHTML = `
            <div class="analysis-result">
              ${renderItemCard(itemName, itemCost)}
              <div class="result-grid">
                <div class="result-column decision-column">
                  ${renderDecisionBox(pds, recText, recClass)}
                  <div class="gauge-container" id="basic-gauge"></div>
                </div>
                <div class="result-column factors-column">
                  <h3>Factor Analysis</h3>
                  <div class="radar-container" id="basic-radar"></div>
                  <div id="basic-factors"></div>
                </div>
              </div>
            </div>
          `;
  
          // Render factor cards - matching Streamlit version's presentation
          const factorsDiv = document.getElementById("basic-factors");
          factorsDiv.innerHTML = `<h3>Decision Factors</h3>`;
  
          for (const factor of ["D", "O", "G", "L", "B"]) {
            const val = factors[factor] || 0;
            factorsDiv.innerHTML += renderFactorCard(
              factor,
              val,
              Config.FACTOR_LABELS[factor]
            );
  
            // Add explanation as caption if available (like in Streamlit)
            const explanationKey = `${factor}_explanation`;
            if (factors[explanationKey]) {
              factorsDiv.innerHTML += `<div class="factor-explanation">${factors[explanationKey]}</div>`;
            }
          }
  
          // Create Plotly charts with the same style as Streamlit
          setTimeout(() => {
            createRadarChart("basic-radar", factors);
            createPdsGauge("basic-gauge", pds);
            // Add animation class to result
            document.querySelector(".analysis-result").classList.add("result-animated");
          }, 100);
        } catch (error) {
          console.error("Error in analysis:", error);
          basicResultDiv.innerHTML = `
            <div class="error-message">
              <h3>Analysis Error</h3>
              <p>We couldn't complete your analysis. Please try again later or contact support.</p>
              <button class="retry-btn" onclick="location.reload()">Retry</button>
            </div>
          `;
        }
      });
    }
  
    /**************************************************
     * ADVANCED FORM SUBMISSION - Matches Streamlit version
     **************************************************/
    if (advancedForm) {
      advancedForm.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        // Validate form
        if (!advancedForm.checkValidity()) {
          showValidationMessages(advancedForm);
          return;
        }
  
        // Show loading state
        advancedResultDiv.innerHTML = renderLoadingState();
  
        // Scroll to results
        setTimeout(() => {
          advancedResultDiv.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
  
        try {
          // Collect user input - same fields as Streamlit
          const itemName =
            document.getElementById("adv-item-name").value.trim() || "Unnamed";
          const itemCost =
            parseFloat(document.getElementById("adv-item-cost").value) || 0;
          const leftoverIncome =
            parseFloat(document.getElementById("adv-leftover-income").value) || 0;
          const hasDebt = document.getElementById("adv-debt").value;
          const mainGoal = document.getElementById("adv-goal").value;
          const urgency = document.getElementById("adv-urgency").value;
          const extraNotes = document.getElementById("adv-extra-notes").value;
  
          // Call the Gemini API with the same parameter structure as Streamlit
          const factors = await callGeminiAPI({
            leftoverIncome,
            hasHighInterestDebt: hasDebt,
            mainFinancialGoal: mainGoal,
            purchaseUrgency: urgency,
            itemName,
            itemCost,
            extraContext: extraNotes
          });
  
          const pds = computePDS(factors);
          const { text: recText, cssClass: recClass } = getRecommendation(pds);
  
          // Render the result with improved UI
          advancedResultDiv.innerHTML = `
            <div class="analysis-result">
              ${renderItemCard(itemName, itemCost)}
              <div class="result-grid">
                <div class="result-column decision-column">
                  ${renderDecisionBox(pds, recText, recClass)}
                  <div class="gauge-container" id="advanced-gauge"></div>
                </div>
                <div class="result-column factors-column">
                  <h3>Factor Analysis</h3>
                  <div class="radar-container" id="advanced-radar"></div>
                  <div id="advanced-factors"></div>
                </div>
                ${
                  extraNotes
                    ? `
                <div class="extra-context">
                  <h4>Your Additional Context</h4>
                  <p>${extraNotes}</p>
                </div>
                `
                    : ""
                }
              </div>
            </div>
          `;
  
          // Render factor cards with explanations - matching Streamlit
          const factorsDiv = document.getElementById("advanced-factors");
          factorsDiv.innerHTML = `<h3>Decision Factors</h3>`;
  
          for (const factor of ["D", "O", "G", "L", "B"]) {
            const val = factors[factor] || 0;
            factorsDiv.innerHTML += renderFactorCard(
              factor,
              val,
              Config.FACTOR_LABELS[factor]
            );
  
            // Add explanation as caption if available (like in Streamlit)
            const explanationKey = `${factor}_explanation`;
            if (factors[explanationKey]) {
              factorsDiv.innerHTML += `<div class="factor-explanation">${factors[explanationKey]}</div>`;
            }
          }
  
          // Plotly charts with animation
          setTimeout(() => {
            createRadarChart("advanced-radar", factors);
            createPdsGauge("advanced-gauge", pds);
            // Add animation class to result
            document.querySelector(".analysis-result").classList.add("result-animated");
          }, 100);
        } catch (error) {
          console.error("Error in advanced analysis:", error);
          advancedResultDiv.innerHTML = `
            <div class="error-message">
              <h3>Analysis Error</h3>
              <p>We couldn't complete your analysis. Please try again later or contact support.</p>
              <button class="retry-btn" onclick="location.reload()">Retry</button>
            </div>
          `;
        }
      });
    }
  
    // Initialize with URL params if they exist
    loadFromUrlParams();
  });
  
  /***************************************************************
   * RENDER HELPER FUNCTIONS - Styled to match Streamlit version
   ***************************************************************/
  function renderItemCard(itemName, cost) {
    // Choose icon based on price and name - similar to Streamlit logic
    let icon = "🛍️";
    if (cost >= 5000) icon = "💰";
    else if (cost >= 1000) icon = "💼";
  
    // Check for specific item types
    const nameLower = itemName.toLowerCase();
    if (
      nameLower.includes("house") ||
      nameLower.includes("home") ||
      nameLower.includes("apartment")
    ) {
      icon = "🏠";
    } else if (
      nameLower.includes("car") ||
      nameLower.includes("vehicle")
    ) {
      icon = "🚗";
    } else if (
      nameLower.includes("computer") ||
      nameLower.includes("laptop")
    ) {
      icon = "💻";
    } else if (
      nameLower.includes("phone") ||
      nameLower.includes("mobile")
    ) {
      icon = "📱";
    }
  
    return `
      <div class="item-card">
        <div class="item-icon">${icon}</div>
        <div class="item-details">
          <div class="item-name">${itemName}</div>
        </div>
        <div class="item-cost">
          $${cost.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </div>
      </div>
    `;
  }
  
  function renderDecisionBox(pds, recText, recClass) {
    // Add descriptive text based on score - like in Streamlit
    let scoreDescription = "";
    if (pds >= 7) {
      scoreDescription = "This looks like a great purchase!";
    } else if (pds >= 5) {
      scoreDescription = "This purchase aligns with your financial goals.";
    } else if (pds >= 0) {
      scoreDescription = "This purchase requires more consideration.";
    } else if (pds >= -5) {
      scoreDescription = "This purchase may not be advisable right now.";
    } else {
      scoreDescription = "This purchase is strongly discouraged.";
    }
  
    return `
      <div class="decision-box">
        <h2>Purchase Decision Score</h2>
        <div class="score">${pds}</div>
        <div class="recommendation ${recClass}">${recText}</div>
        <p class="score-description">${scoreDescription}</p>
      </div>
    `;
  }
  
  function renderFactorCard(factor, value, description) {
    // Enhanced color logic for factor value - matching Streamlit version
    let valClass = "neutral";
    if (value > 0) valClass = "positive";
    if (value < 0) valClass = "negative";
  
    return `
      <div class="factor-card">
        <div class="factor-letter">${factor}</div>
        <div class="factor-description">${description}</div>
        <div class="factor-value ${valClass}">
          ${value > 0 ? "+" + value : value}
        </div>
      </div>
    `;
  }
  
  function renderLoadingState() {
    return `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <h3>Analyzing with Munger AI...</h3>
        <p>Crunching numbers and evaluating your decision factors</p>
      </div>
    `;
  }
  
  /***************************************************************
   * UTILITY FUNCTIONS
   ***************************************************************/
  
  function initializeTooltips() {
    const tooltips = document.querySelectorAll("[data-tooltip]");
    tooltips.forEach((tooltip) => {
      tooltip.addEventListener("mouseenter", function () {
        const tooltipText = this.dataset.tooltip;
        const tooltipElement = document.createElement("div");
        tooltipElement.className = "tooltip";
        tooltipElement.textContent = tooltipText;
        document.body.appendChild(tooltipElement);
  
        const rect = this.getBoundingClientRect();
        tooltipElement.style.top =
          rect.top - tooltipElement.offsetHeight - 10 + "px";
        tooltipElement.style.left =
          rect.left + rect.width / 2 - tooltipElement.offsetWidth / 2 + "px";
        tooltipElement.style.opacity = "1";
      });
  
      tooltip.addEventListener("mouseleave", function () {
        const tooltipElement = document.querySelector(".tooltip");
        if (tooltipElement) {
          tooltipElement.remove();
        }
      });
    });
  }
  
  function initializeFormValidation(form) {
    // Add required attributes and validation styling
    form.querySelectorAll("input, select, textarea").forEach((element) => {
      if (!element.hasAttribute("data-optional")) {
        element.setAttribute("required", "");
      }
  
      // Add validation events
      element.addEventListener("invalid", function () {
        this.classList.add("invalid");
      });
  
      element.addEventListener("input", function () {
        this.classList.remove("invalid");
        if (this.validity.valid) {
          this.classList.add("valid");
        } else {
          this.classList.remove("valid");
        }
      });
    });
  }
  
  function showValidationMessages(form) {
    // Highlight the first invalid field and scroll to it
    const firstInvalid = form.querySelector(":invalid");
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.classList.add("invalid-shake");
      setTimeout(() => {
        firstInvalid.classList.remove("invalid-shake");
      }, 600);
    }
  }
  
  function loadFromUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const item = urlParams.get("item");
    const score = urlParams.get("score");
  
    if (item && score) {
      // Show shared result banner
      const banner = document.createElement("div");
      banner.className = "shared-result-banner";
      banner.innerHTML = `
        <div class="shared-result-content">
          <h3>Shared Result</h3>
          <p>You're viewing a shared purchase decision for <strong>${item}</strong> with a score of <strong>${score}</strong>.</p>
          <button class="create-own-btn" onclick="clearSharedResult()">Create Your Own</button>
        </div>
      `;
      document.body.insertBefore(banner, document.body.firstChild);
  
      // Pre-fill the basic form's item name field with the shared item
      const basicItemField = document.getElementById("basic-item-name");
      if (basicItemField) {
        basicItemField.value = item;
      }
    }
  }
  
  /***************************************************************
   * GLOBAL FUNCTIONS (attached to window)
   ***************************************************************/
  
  // Clear shared result and params
  window.clearSharedResult = function () {
    // Remove banner
    const banner = document.querySelector(".shared-result-banner");
    if (banner) {
      banner.remove();
    }
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
  };
  
  // Share results function
  window.shareResults = function (itemName, pds) {
    // Create URL with params
    const url = new URL(window.location.href);
    url.searchParams.set("item", itemName);
    url.searchParams.set("score", pds);
  
    // Try to use the Web Share API if available
    if (navigator.share) {
      navigator
        .share({
          title: "Munger AI Purchase Decision",
          text: `My purchase decision score for ${itemName} is ${pds}!`,
          url: url.toString()
        })
        .catch((err) => {
          console.log("Error sharing:", err);
          // Fallback to showing copy link
          document.querySelectorAll(".copy-link").forEach((el) => (el.style.display = "flex"));
        });
    } else {
      // Fallback for browsers that don't support sharing
      document.querySelectorAll(".copy-link").forEach((el) => (el.style.display = "flex"));
    }
  };
  
  // Function to copy share link
  window.copyShareLink = function (elementId) {
    const copyText = document.getElementById(elementId);
    copyText.select();
    document.execCommand("copy");
  
    // Show copied notification
    const button = copyText.nextElementSibling;
    const originalText = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied");
  
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("copied");
    }, 2000);
  };
