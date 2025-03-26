document.addEventListener("DOMContentLoaded", () => {
  const imageUpload = document.getElementById("imageUpload");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const resultContainer = document.getElementById("resultContainer");

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  analyzeBtn.addEventListener("click", async () => {
    const itemName = document.getElementById("itemName").value.trim();
    const itemCost = document.getElementById("itemCost").value.trim();

    if (!itemName || !itemCost) {
      alert("Please fill in both 'What are you buying?' and 'Cost ($)'.");
      return;
    }

    let base64Image = null;
    const file = imageUpload.files[0];
    if (file) {
      base64Image = await fileToBase64(file);
    }

    resultContainer.innerHTML = "<p>Analyzing...</p>";
    
    // Show what URL we're trying to access (for debugging)
    console.log("Attempting to fetch from: /api/analyze");

    try {
      // Try direct path first
      let apiUrl = "/api/analyze";
      console.log(`Trying API endpoint: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
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

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errText = await response.text();
        console.error(`Error details: ${errText}`);
        throw new Error(`HTTP Error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      resultContainer.innerHTML = `
        <h2>Results</h2>
        <p><strong>Item Identified:</strong> ${data.name}</p>
        <p><strong>Estimated Cost:</strong> $${data.cost.toFixed(2)}</p>
        <p><strong>Interesting Facts:</strong> ${data.facts}</p>
        <hr/>
        <p><strong>Recommendation:</strong> ${data.recommendation}</p>
        <p>${data.explanation}</p>
      `;
    } catch (error) {
      console.error("Fetch error:", error);
      
      // Try with a fallback URL for testing
      resultContainer.innerHTML = `
        <p style="color:red;">Error: ${error.message}</p>
        <p>Debugging info:</p>
        <ul>
          <li>API URL: /api/analyze</li>
          <li>Browser URL: ${window.location.href}</li>
          <li>Full error: ${error.toString()}</li>
        </ul>
      `;
    }
  });

  // Add a test button to HTML
  const formCard = document.querySelector('.form-card');
  const testButton = document.createElement('button');
  testButton.textContent = 'Test API Connection';
  testButton.classList.add('cta-button');
  testButton.style.marginTop = '10px';
  testButton.style.backgroundColor = '#4CAF50';
  formCard.appendChild(testButton);

  // Add event listener for test button
  testButton.addEventListener('click', async () => {
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
        the issue is likely in the analyze.py file.</p>
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
