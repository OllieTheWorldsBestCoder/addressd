(function() {
  const container = document.getElementById('addressd-embed');
  const token = document.currentScript.dataset.token;
  const addressId = document.currentScript.dataset.address;
  const baseUrl = 'https://addressd.vercel.app';

  async function fetchDescription() {
    try {
      const response = await fetch(`${baseUrl}/api/embed/description?addressId=${addressId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        container.innerHTML = `
          <div class="addressd-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 1rem;">
            <p style="margin: 0 0 1rem 0;">${data.description}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
              <a href="${baseUrl}/upload/${addressId}" target="_blank" style="color: #4a90e2; text-decoration: none;">
                Add Description →
              </a>
              <small style="color: #666;">
                Powered by <a href="${baseUrl}" target="_blank" style="color: #4a90e2; text-decoration: none;">addressd</a>
              </small>
            </div>
          </div>
        `;
      } else {
        container.innerHTML = 'Unable to load address description';
      }
    } catch (error) {
      container.innerHTML = 'Error loading address description';
    }
  }

  // Initial fetch
  fetchDescription();
})(); 