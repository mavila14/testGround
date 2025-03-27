document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const imageUpload = document.getElementById("imageUpload");
  const takePhotoBtn = document.getElementById("takePhotoBtn");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const resultContainer = document.getElementById("resultContainer");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const resultContent = document.getElementById("resultContent");
  const imagePreview = document.getElementById("imagePreview");
  const cameraContainer = document.getElementById("cameraContainer");
  const cameraStream = document.getElementById("cameraStream");
  const captureBtn = document.getElementById("captureBtn");
  const cancelCameraBtn = document.getElementById("cancelCameraBtn");
  const itemNameInput = document.getElementById("itemName");
  const itemCostInput = document.getElementById("itemCost");
  
  // Advanced analysis elements
  const advancedToggle = document.getElementById("advancedToggle");
  const advancedSection = document.getElementById("advancedSection");
  const itemPurpose = document.getElementById("itemPurpose");
  const itemFrequency = document.getElementById("itemFrequency");
  const itemLifespan = document.getElementById("itemLifespan");
  const alternativeCost = document.getElementById("alternativeCost");
  const userNotes = document.getElementById("userNotes");

  // Camera stream variable
  let stream = null;
  let capturedImage = null;
  
  // Toggle advanced analysis section
  advancedToggle.addEventListener("click", () => {
    advancedToggle.classList.toggle("open");
    advancedSection.classList.toggle("open");
    
    // Smooth animation for opening/closing
    if (advancedSection.classList.contains("open")) {
      advancedSection.style.maxHeight = advancedSection.scrollHeight + "px";
    } else {
      advancedSection.style.maxHeight = "0";
    }
  });
  
  // Add focus animation to input fields
  const animateLabel = (input, labelSelector) => {
    input.addEventListener("focus", () => {
      const label = document.querySelector(labelSelector);
      if (label) {
        label.style.color = "#4f46e5";
        label.style.transform = "translateY(-3px)";
      }
    });
    
    input.addEventListener("blur", () => {
      const label = document.querySelector(labelSelector);
      if (label) {
        label.style.color = "";
        label.style.transform = "";
      }
    });
  };
  
  // Apply animations to form fields
  animateLabel(itemNameInput, 'label[for="itemName"]');
  animateLabel(itemCostInput, 'label[for="itemCost"]');
  animateLabel(itemLifespan, 'label[for="itemLifespan"]');
  animateLabel(alternativeCost, 'label[for="alternativeCost"]');
  animateLabel(userNotes, 'label[for="userNotes"]');
  
  // Add button press effect
  analyzeBtn.addEventListener("mousedown", () => {
    analyzeBtn.style.transform = "scale(0.98)";
  });
  
  analyzeBtn.addEventListener("mouseup", () => {
    analyzeBtn.style.transform = "";
  });
  
  // Add input validation visual feedback
  itemNameInput.addEventListener("input", () => {
    validateInputs();
  });
  
  itemCostInput.addEventListener("input", () => {
    validateInputs();
  });
  
  function validateInputs() {
    const nameValue = itemNameInput.value.trim();
    const costValue = itemCostInput.value.trim();
    
    if (nameValue && costValue && parseFloat(costValue) > 0) {
      analyzeBtn.classList.add("ready");
    } else {
      analyzeBtn.classList.remove("ready");
    }
  }

  // Camera functionality
  takePhotoBtn.addEventListener("click", async () => {
    try {
      // Add button animation
      takePhotoBtn.classList.add("active");
      
      // Request camera access
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });

      // Display the camera preview with animation
      cameraStream.srcObject = stream;
      cameraContainer.classList.remove("hidden");
      cameraContainer.style.opacity = "0";
      setTimeout(() => {
        cameraContainer.style.opacity = "1";
      }, 10);
      
      takePhotoBtn.classList.remove("active");
      takePhotoBtn.classList.add("hidden");

    } catch (err) {
      console.error("Error accessing camera:", err);
      takePhotoBtn.classList.remove("active");
      alert("Could not access camera. Please check your permissions or upload an image.");
    }
  });

  // Capture photo from camera
  captureBtn.addEventListener("click", () => {
    // Add button animation
    captureBtn.classList.add("active");
    
    const canvas = document.createElement("canvas");
    canvas.width = cameraStream.videoWidth;
    canvas.height = cameraStream.videoHeight;
    const ctx = canvas.getContext("2d");

    // Draw current frame from video
    ctx.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);

    // Get image data as base64
    capturedImage = canvas.toDataURL("image/jpeg");

    // Show preview of captured image with fade-in effect
    imagePreview.innerHTML = `<img src="${capturedImage}" alt="Captured image" style="opacity: 0">`;
    setTimeout(() => {
      imagePreview.querySelector("img").style.opacity = "1";
    }, 10);

    // Stop camera and hide camera container
    stopCamera();
    captureBtn.classList.remove("active");
  });

  // Cancel camera
  cancelCameraBtn.addEventListener("click", stopCamera);

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    
    // Add animation when closing camera
    cameraContainer.style.opacity = "0";
    setTimeout(() => {
      cameraContainer.classList.add("hidden");
      takePhotoBtn.classList.remove("hidden");
    }, 300);
  }

  // Convert uploaded file to base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // Handle image upload preview with animation
  imageUpload.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        capturedImage = null; // Reset if previously captured
        
        // Create image with fade-in effect
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Item preview" style="opacity: 0">`;
        setTimeout(() => {
          imagePreview.querySelector("img").style.opacity = "1";
        }, 10);
      };
      reader.readAsDataURL(file);
    }
  });

  // Loading messages for a more engaging experience
  const loadingMessages = [
    "Consulting Charlie Munger's wisdom...",
    "Analyzing purchase value...",
    "Calculating opportunity cost...",
    "Applying mental models...",
    "Making investment decision..."
  ];
  
  let loadingMessageIndex = 0;
  let loadingInterval;
  
  function startLoadingAnimation() {
    const loadingText = loadingIndicator.querySelector("p");
    loadingText.textContent = loadingMessages[0];
    
    loadingInterval = setInterval(() => {
      loadingMessageIndex = (loadingMessageIndex + 1) % loadingMessages.length;
      loadingText.style.opacity = "0";
      
      setTimeout(() => {
        loadingText.textContent = loadingMessages[loadingMessageIndex];
        loadingText.style.opacity = "1";
      }, 300);
    }, 2000);
  }
  
  function stopLoadingAnimation() {
    clearInterval(loadingInterval);
  }
  
  // Collect advanced analysis data
  function getAdvancedAnalysisData() {
    // Only collect data if the advanced section is open
    if (!advancedSection.classList.contains("open")) {
      return null;
    }
    
    const advancedData = {
      purpose: itemPurpose.value || null,
      frequency: itemFrequency.value || null,
      lifespan: itemLifespan.value ? parseFloat(itemLifespan.value) : null,
      alternativeCost: alternativeCost.value ? parseFloat(alternativeCost.value) : null,
      notes: userNotes.value.trim() || null
    };
    
    // Only return if at least one field has data
    const hasData = Object.values(advancedData).some(value => value !== null && value !== "");
    return hasData ? advancedData : null;
  }

  // Analyze button click with enhanced animations
  analyzeBtn.addEventListener("click", async () => {
    const itemName = itemNameInput.value.trim();
    const itemCost = itemCostInput.value.trim();

    if (!itemName || !itemCost) {
      // Shake animation for invalid input
      analyzeBtn.classList.add("shake");
      setTimeout(() => {
        analyzeBtn.classList.remove("shake");
        alert("Please provide both the item name and cost.");
      }, 500);
      return;
    }

    // Show loading state with animation
    resultContainer.classList.remove("hidden");
    loadingIndicator.classList.remove("hidden");
    resultContent.innerHTML = "";
    
    // Start the loading message rotation
    startLoadingAnimation();

    let base64Image = null;

    // Use camera-captured image or uploaded file
    try {
      if (capturedImage) {
        base64Image = capturedImage.split(",")[1];
      } else if (imageUpload.files[0]) {
        const file = imageUpload.files[0];
        base64Image = await fileToBase64(file);
      }
    } catch (error) {
      console.error("Error processing image:", error);
    }
    
    // Get advanced analysis data if available
    const advancedData = getAdvancedAnalysisData();

    try {
      // Prepare request data
      const requestData = {
        itemName,
        itemCost: parseFloat(itemCost),
        imageBase64: base64Image
      };
      
      // Add advanced data if available
      if (advancedData) {
        requestData.advancedData = advancedData;
      }
      
      // Make request to backend API
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Stop the loading animation
      stopLoadingAnimation();

      // "Buy" or "Don't Buy" logic for styling
      const recommendationClass = data.recommendation.toLowerCase().includes("don't") ? 
        "dont-buy" : "buy";

      // Random Munger quotes for additional wisdom
      const mungerQuotes = [
        "Take a simple idea and take it seriously.",
        "The big money is not in the buying and selling, but in the waiting.",
        "All intelligent investing is value investing.",
        "Knowing what you don't know is more useful than being brilliant.",
        "Spend each day trying to be a little wiser than you were when you woke up."
      ];
      
      const randomQuoteIndex = Math.floor(Math.random() * mungerQuotes.length);

      let resultsHTML = `
        <h2>Purchase Analysis</h2>
        <p><strong>Item:</strong> ${data.name}</p>
        <p><strong>Cost:</strong> $${parseFloat(data.cost).toFixed(2)}</p>
      `;

      // Add interesting facts if available
      if (data.facts) {
        resultsHTML += `<p><strong>Interesting Facts:</strong> ${data.facts}</p>`;
      }

      // Add recommendation and explanation
      resultsHTML += `
        <div class="recommendation-container">
          <h3>Charlie Munger's Recommendation:</h3>
          <div class="recommendation ${recommendationClass}">
            ${data.recommendation}
          </div>
          <p>${data.explanation}</p>
        </div>
        
        <div class="munger-quote">
          "${mungerQuotes[randomQuoteIndex]}"
          <div style="text-align: right; margin-top: 8px; font-weight: 500;">— Charlie Munger</div>
        </div>
      `;

      // Hide loading indicator and show results
      loadingIndicator.classList.add("hidden");
      resultContent.innerHTML = resultsHTML;

      // Smooth scroll to results
      resultContainer.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });

    } catch (error) {
      console.error("Error:", error);
      
      // Stop the loading animation
      stopLoadingAnimation();
      
      // Show error with animation
      loadingIndicator.classList.add("hidden");
      resultContent.innerHTML = `
        <h2>Oops! Something went wrong</h2>
        <p>We couldn't analyze your item at this time. Please try again later.</p>
        <p><small>Error details: ${error.message}</small></p>
      `;
    }
  });
});
