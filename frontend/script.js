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
  const financialForm = document.getElementById("financialForm");
  const advancedToggle = document.getElementById("advancedToggle");

  // Camera stream variable
  let stream = null;
  let capturedImage = null;

  // Toggle advanced options
  if (advancedToggle) {
    advancedToggle.addEventListener("click", () => {
      const advancedOptions = document.getElementById("advancedOptions");
      if (advancedOptions.classList.contains("hidden")) {
        advancedOptions.classList.remove("hidden");
        advancedToggle.innerHTML = "Hide Advanced Options <i class=\"fas fa-chevron-up\"></i>";
      } else {
        advancedOptions.classList.add("hidden");
        advancedToggle.innerHTML = "Show Advanced Options <i class=\"fas fa-chevron-down\"></i>";
      }
    });
  }

  // Camera functionality
  takePhotoBtn.addEventListener("click", async () => {
    try {
      // Request camera access
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });

      // Display the camera preview
      cameraStream.srcObject = stream;
      cameraContainer.classList.remove("hidden");
      takePhotoBtn.classList.add("hidden");

    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check your permissions or upload an image.");
    }
  });

  // Capture photo from camera
  captureBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = cameraStream.videoWidth;
    canvas.height = cameraStream.videoHeight;
    const ctx = canvas.getContext("2d");

    // Draw current frame from video
    ctx.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);

    // Get image data as base64
    capturedImage = canvas.toDataURL("image/jpeg");

    // Show preview of captured image
    imagePreview.innerHTML = `<img src="${capturedImage}" alt="Captured image">`;

    // Stop camera and hide camera container
    stopCamera();
  });

  // Cancel camera
  cancelCameraBtn.addEventListener("click", stopCamera);

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    cameraContainer.classList.add("hidden");
    takePhotoBtn.classList.remove("hidden");
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

  // Handle image upload preview
  imageUpload.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        capturedImage = null; // Reset if previously captured
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Item preview">`;
      };
      reader.readAsDataURL(file);
    }
  });

  // Analyze button click
  analyzeBtn.addEventListener("click", async () => {
    const itemName = document.getElementById("itemName").value.trim();
    const itemCost = document.getElementById("itemCost").value.trim();
    
    // Get additional financial data if available
    const leftoverIncome = document.getElementById("leftoverIncome")?.value || "2000";
    const hasDebt = document.getElementById("hasDebt")?.checked ? "Yes" : "No";
    const financialGoal = document.getElementById("financialGoal")?.value || "";
    const urgencySelect = document.getElementById("urgency");
    const urgency = urgencySelect ? urgencySelect.value : "Mixed";
    const extraContext = document.getElementById("extraContext")?.value || "";

    if (!itemName || !itemCost) {
      alert("Please provide both the item name and your budget.");
      return;
    }

    // Show loading state
    resultContainer.classList.remove("hidden");
    loadingIndicator.classList.remove("hidden");
    resultContent.innerHTML = "";

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

    try {
      // Make request to backend API
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          itemName,
          itemCost: parseFloat(itemCost),
          leftoverIncome: parseFloat(leftoverIncome),
          hasDebt,
          financialGoal,
          urgency,
          extraContext,
          imageBase64: base64Image
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // "Buy" or "Don't Buy" logic for styling
      const recommendationClass = data.recommendation.toLowerCase().includes("don't") || 
                                  data.recommendation.toLowerCase().includes("consider")
        ? (data.recommendation.toLowerCase().includes("don't") ? "dont-buy" : "neutral")
        : "buy";

      // Format factors and insights for display
      const factorsHTML = data.factors ? 
        `<div class="factor-list">
           ${data.factors.map(factor => `<p>${factor}</p>`).join('')}
         </div>` : '';
      
      const insightsHTML = data.insights ? 
        `<div class="insights">
           <h3>Insights</h3>
           <ul>
             ${data.insights.map(insight => `<li>${insight}</li>`).join('')}
           </ul>
         </div>` : '';

      // Build the full result HTML
      let resultsHTML = `
        <h2>Purchase Analysis Results</h2>
        <p><strong>Item:</strong> ${data.name}</p>
        <p><strong>Your Budget:</strong> $${parseFloat(itemCost).toFixed(2)}</p>
      `;

      // Add estimated cost if it came from image analysis
      if (data.cost && data.cost !== parseFloat(itemCost)) {
        resultsHTML += `<p><strong>Estimated Market Cost:</strong> $${data.cost.toFixed(2)}</p>`;
      }

      // Add interesting facts if available
      if (data.facts) {
        resultsHTML += `<p><strong>Interesting Facts:</strong> ${data.facts}</p>`;
      }

      // Add PDS score
      if (data.pds_score !== undefined) {
        resultsHTML += `
          <div class="pds-score-container">
            <div class="pds-score ${recommendationClass}">
              <span>PDS Score: ${data.pds_score}</span>
            </div>
          </div>
        `;
      }

      // Add recommendation and explanation
      resultsHTML += `
        <div class="recommendation-container">
          <p><strong>Recommendation:</strong> 
            <span class="recommendation ${recommendationClass}">
              ${data.recommendation}
            </span>
          </p>
          <p>${data.explanation}</p>
        </div>
      `;

      // Add factors and insights
      resultsHTML += `
        <div class="analysis-details">
          <h3>Factor Analysis</h3>
          ${factorsHTML}
          ${insightsHTML}
        </div>
      `;

      resultContent.innerHTML = resultsHTML;

      // Smooth scroll to results
      resultContainer.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      console.error("Error:", error);
      resultContent.innerHTML = `
        <h2>Oops! Something went wrong</h2>
        <p>We couldn't analyze your item at this time. Please try again later.</p>
        <p><small>Error details: ${error.message}</small></p>
      `;
    } finally {
      // Hide loading indicator
      loadingIndicator.classList.add("hidden");
    }
  });

  // Add a test button for API connectivity (for debugging)
  const formCard = document.querySelector('.form-card');
  if (formCard && !document.getElementById('testApiButton')) {
    const testButton = document.createElement('button');
    testButton.id = 'testApiButton';
    testButton.textContent = 'Test API Connection';
    testButton.classList.add('btn', 'btn-secondary');
    testButton.style.marginTop = '10px';
    testButton.style.backgroundColor = '#4CAF50';
    formCard.appendChild(testButton);

    // Add event listener for test button
    testButton.addEventListener('click', async () => {
      resultContainer.classList.remove("hidden");
      resultContent.innerHTML = "<p>Testing API connection...</p>";
      
      try {
        const response = await fetch('/api/test', {
          method: 'GET'
        });
        
        console.log('Test API response status:', response.status);
        
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP Error: ${response.status} - ${errText}`);
        }
        
        const data = await response.json();
        resultContent.innerHTML = `
          <h2>API Test Results</h2>
          <p>Status: ${data.status}</p>
          <p>Message: ${data.message}</p>
          <p>This means the API is reachable. If the main function isn't working,
          the issue is likely in the analyze function.</p>
        `;
      } catch (error) {
        console.error('Test API error:', error);
        resultContent.innerHTML = `
          <p style="color:red;">API Test Failed: ${error.message}</p>
          <p>This suggests your API endpoints aren't being properly deployed or configured.</p>
        `;
      }
    });
  }
});
