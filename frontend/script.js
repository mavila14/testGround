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

  // Camera stream variable
  let stream = null;
  let capturedImage = null;

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

    if (!itemName || !itemCost) {
      alert("Please provide both the item name and cost.");
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
          imageBase64: base64Image
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // "Buy" or "Don't Buy" logic for styling
      const recommendationClass = data.recommendation.toLowerCase().includes("don't") ? 
        "dont-buy" : "buy";

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

  // No test button needed
});
