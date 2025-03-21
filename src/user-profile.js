/***************************************************************
 * user-profile.js
 *
 * Manages the user financial profile data for personalized
 * purchase recommendations from Munger AI.
 ***************************************************************/

document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on the profile page
  const profileSection = document.getElementById('profile-section');
  if (!profileSection) return;

  // Constants & Elements
  const API_BASE_URL = '/api';
  const profileForm = document.getElementById('profile-form');
  const profileResult = document.getElementById('profile-result');
  const completionProgress = document.getElementById('completion-progress');
  const completionPercentage = document.getElementById('completion-percentage');
  
  // Navigation buttons for post-save actions
  const dashboardBtn = document.getElementById('go-to-dashboard');
  const decisionToolBtn = document.getElementById('go-to-decision-tool');
  
  // Initialize profile with stored data (if any)
  loadUserProfile();
  
  // Set up form submission
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Check authentication
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to save your profile');
        return;
      }
      
      // Collect form data
      const formData = new FormData(profileForm);
      const profileData = {};
      
      // Convert FormData to regular object
      for (const [key, value] of formData.entries()) {
        profileData[key] = value;
      }
      
      // Calculate some derived values for better recommendations
      if (profileData.monthlyIncome && profileData.monthlyExpenses) {
        profileData.disposableIncome = 
          parseFloat(profileData.monthlyIncome) - parseFloat(profileData.monthlyExpenses);
      }
      
      if (profileData.highInterestDebt && profileData.lowInterestDebt) {
        profileData.totalDebt = 
          parseFloat(profileData.highInterestDebt) + parseFloat(profileData.lowInterestDebt);
      }
      
      if (profileData.emergencyFund && profileData.monthlyExpenses) {
        profileData.emergencyFundMonths = 
          parseFloat(profileData.emergencyFund) / parseFloat(profileData.monthlyExpenses);
      }
      
      try {
        // In a production environment, you would save this to a backend
        // For now we'll store in localStorage with the username as the key
        const username = localStorage.getItem('username');
        
        // Save the profile data to localStorage
        localStorage.setItem(`profile_${username}`, JSON.stringify(profileData));
        
        // Show success message
        profileForm.classList.add('hidden');
        profileResult.classList.remove('hidden');
        
        // Animate success appearance
        profileResult.style.animation = 'fadeIn 0.6s ease-out';
        
      } catch (error) {
        console.error('Error saving profile:', error);
        alert('There was an error saving your profile. Please try again.');
      }
    });
  }
  
  // Add input handlers to update completion percentage in real-time
  const formInputs = profileForm.querySelectorAll('input, select, textarea');
  formInputs.forEach(input => {
    input.addEventListener('input', updateCompletionPercentage);
    input.addEventListener('change', updateCompletionPercentage);
  });
  
  // Navigation button event listeners
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      // For now, just redirect to the main page
      window.location.href = 'index.html';
      
      // Activate the dashboard tab
      const dashboardTab = document.getElementById('nav-dashboard');
      if (dashboardTab) dashboardTab.click();
    });
  }
  
  if (decisionToolBtn) {
    decisionToolBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
      
      // Activate the basic tool tab
      const basicToolTab = document.getElementById('nav-basic');
      if (basicToolTab) basicToolTab.click();
    });
  }
  
  /**
   * Loads the user's financial profile from localStorage if it exists
   */
  function loadUserProfile() {
    const username = localStorage.getItem('username');
    if (!username) return;
    
    const profileData = localStorage.getItem(`profile_${username}`);
    if (!profileData) return;
    
    try {
      const data = JSON.parse(profileData);
      
      // Fill in form values
      for (const [key, value] of Object.entries(data)) {
        const input = profileForm.elements[key];
        if (input) {
          input.value = value;
        }
      }
      
      // Update completion percentage
      updateCompletionPercentage();
      
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  }
  
  /**
   * Calculates and updates the profile completion percentage
   */
  function updateCompletionPercentage() {
    // Get all required fields (not including textarea which is optional)
    const requiredInputs = Array.from(
      profileForm.querySelectorAll('input, select')
    );
    
    // Count completed fields
    const completedFields = requiredInputs.filter(input => {
      return input.value && input.value.trim() !== '';
    }).length;
    
    // Calculate percentage
    const percentage = Math.round((completedFields / requiredInputs.length) * 100);
    
    // Update UI
    completionPercentage.textContent = `${percentage}%`;
    completionProgress.style.width = `${percentage}%`;
    
    // Set color based on completion
    if (percentage < 30) {
      completionProgress.style.backgroundColor = '#f56565'; // danger/red
    } else if (percentage < 70) {
      completionProgress.style.backgroundColor = '#ed8936'; // warning/orange
    } else {
      completionProgress.style.backgroundColor = '#48bb78'; // success/green
    }
  }
  
  /**
   * Returns the user's financial profile for use in purchase decisions
   * This function can be imported by other modules like helper.js
   */
  function getUserFinancialProfile() {
    const username = localStorage.getItem('username');
    if (!username) return null;
    
    const profileData = localStorage.getItem(`profile_${username}`);
    if (!profileData) return null;
    
    try {
      return JSON.parse(profileData);
    } catch (error) {
      console.error('Error parsing profile data:', error);
      return null;
    }
  }
  
  // Export the profile getter function for use in other modules
  window.UserProfile = {
    getUserFinancialProfile
  };
});
