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
});
