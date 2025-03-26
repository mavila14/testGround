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

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          itemName,
          itemCost,
          imageBase64: base64Image
        })
      });

      if (!response.ok) {
        const errText = await response.text();
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
      console.error(error);
      resultContainer.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    }
  });
});
