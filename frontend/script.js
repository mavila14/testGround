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
  
  // Mobile menu elements
  const menuToggle = document.getElementById("menuToggle");
  const closeMenu = document.getElementById("closeMenu");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  
  // Variables to store camera stream
  let stream = null;
  let capturedImage = null;
  
  // Ensure mobile menu is properly hidden on page load
  // This is the key fix for the mobile sidebar issue
  if (window.innerWidth <= 768) {
    sidebar.style.transform = "translateX(-100%)";
    document.body.classList.add('menu-closed');
  }
  
  // Mobile menu toggle functions
  menuToggle.addEventListener("click", () => {
    sidebar.classList.add("show");
    overlay.classList.add("show");
    document.body.style.overflow = "hidden";
  });
  
  function closeMenuFunc() {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
    document.body.style.overflow = "";
  }
  
  closeMenu.addEventListener("click", closeMenuFunc);
  overlay.addEventListener("click", closeMenuFunc);
  
  // Camera functionality
  takePhotoBtn.addEventListener("click", async () => {
    try {
      // Get camera stream
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" }, 
        audio: false 
      });
      
      // Show camera container
      cameraStream.srcObject = stream;
      cameraContainer.classList.remove("hidden");
      takePhotoBtn.classList.add("hidden");
      
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please make sure you have granted camera permissions or try uploading an image instead.");
    }
  });
  
  // Capture photo from camera
  captureBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = cameraStream.videoWidth;
    canvas.height = cameraStream.videoHeight;
    const ctx = canvas.getContext("2d");
    
    // Draw current video frame to canvas
    ctx.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);
    
    // Get image data as base64
    capturedImage = canvas.toDataURL("image/jpeg");
    
    // Show preview of captured image
    imagePreview.innerHTML = `<img src="${capturedImage}" alt="Captured image">`;
    
    // Close camera
    stopCamera();
  });
  
  // Cancel camera
  cancelCameraBtn.addEventListener("click", stopCamera);
  
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    cameraContainer.classList.add("hidden");
    takePhotoBtn.classList.remove("hidden");
  }
  
  // File to base64 conversion
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // Show image preview when image is uploaded
  imageUpload.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        capturedImage = null; // Clear captured image if one was taken
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Item preview">`;
      };
      reader.readAsDataURL(file);
    }
  });

  // Analyze button click handler
  analyzeBtn.addEventListener("click", async () => {
    const itemName = document.getElementById("itemName").value.trim();
    const itemCost = document.getElementById("itemCost").value.trim();

    if (!itemName || !itemCost) {
      alert("Please fill in both 'What are you buying?' and 'Your Budget ($)'.");
      return;
    }
    
    if (!imageUpload.files[0] && !capturedImage) {
      alert("Please upload an image or take a photo of the item.");
      return;
    }

    // Show loading state
    resultContainer.classList.remove("hidden");
    loadingIndicator.classList.remove("hidden");
    resultContent.innerHTML = "";

    let base64Image = null;
    
    // Get image data - either from file upload or camera capture
    try {
      if (capturedImage) {
        // Get base64 string from capturedImage
        base64Image = capturedImage.split(",")[1];
      } else {
        // Get base64 from uploaded file
        const file = imageUpload.files[0];
        base64Image = await fileToBase64(file);
      }
    } catch (error) {
      console.error("Error processing image:", error);
    }

    try {
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
      
      // Determine recommendation class
      const recommendationClass = data.recommendation.toLowerCase().includes("don't") ? 
        "dont-buy" : "buy";
      
      resultContent.innerHTML = `
        <h2>Results</h2>
        <p><strong>Item Identified:</strong> ${data.name}</p>
        <p><strong>Estimated Cost:</strong> $${data.cost.toFixed(2)}</p>
        <p><strong>Interesting Facts:</strong> ${data.facts}</p>
        <hr/>
        <p><strong>Recommendation:</strong> <span class="recommendation ${recommendationClass}">${data.recommendation}</span></p>
        <p>${data.explanation}</p>
      `;

      // Scroll to results
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
  
  // Handle window resize to ensure mobile menu behavior is consistent
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      // Reset for desktop
      sidebar.style.transform = "";
      document.body.style.overflow = "";
      overlay.classList.remove("show");
    } else if (!sidebar.classList.contains("show")) {
      // Ensure sidebar is hidden on mobile when not active
      sidebar.style.transform = "translateX(-100%)";
    }
  });
  
  // Add test API button (kept from original code)
  const formCard = document.querySelector('.form-card');
  const testButton = document.createElement('button');
  testButton.textContent = 'Test API Connection';
  testButton.classList.add('cta-button');
  testButton.style.marginTop = '10px';
  testButton.style.backgroundColor = '#4CAF50';
  formCard.appendChild(testButton);

  // Add event listener for test button
  testButton.addEventListener('click', async () => {
    resultContainer.classList.remove("hidden");
    resultContainer.innerHTML = "<p>Testing API connection...</p>";
    
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
      resultContainer.innerHTML = `
        <h2>API Test Results</h2>
        <p>Status: ${data.status}</p>
        <p>Message: ${data.message}</p>
        <p>This means the API is reachable. If the main function isn't working,
        the issue is likely in the analyze function.</p>
      `;
    } catch (error) {
      console.error('Test API error:', error);
      resultContainer.innerHTML = `
        <p style="color:red;">API Test Failed: ${error.message}</p>
        <p>This suggests your API endpoints aren't being properly deployed or configured.</p>
      `;
    }
  });
});
