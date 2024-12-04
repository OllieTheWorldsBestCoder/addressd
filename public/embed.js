(function() {
  const container = document.getElementById('addressd-embed');
  const script = document.currentScript;
  const token = script.dataset.token;
  const addressId = script.dataset.address;
  const baseUrl = '__ADDRESSD_BASE_URL__';

  // Validate base URL was properly injected during build
  if (baseUrl === '__ADDRESSD_BASE_URL__') {
    console.error('Addressd: Base URL not properly configured');
    return;
  }

  if (!container) {
    console.error('Addressd: No container element found with id "addressd-embed"');
    return;
  }

  if (!token || !addressId) {
    container.innerHTML = 'Invalid embed configuration';
    console.error('Addressd: Missing required data attributes (data-token and data-address)');
    return;
  }

  // Show loading state
  container.innerHTML = `
    <div class="addressd-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 1rem;">
      <p style="margin: 0;">Loading address description...</p>
    </div>
  `;

  async function fetchDescription() {
    try {
      const response = await fetch(`${baseUrl}/api/embed/description?addressId=${addressId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': window.location.origin
        },
        credentials: 'omit'
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
        const errorMessage = data.error === 'Subscription required' 
          ? 'Subscription required to view address description'
          : 'Unable to load address description';
        container.innerHTML = `
          <div class="addressd-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 1rem;">
            <p style="margin: 0; color: #dc2626;">${errorMessage}</p>
          </div>
        `;
      }
    } catch (error) {
      container.innerHTML = `
        <div class="addressd-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 1rem;">
          <p style="margin: 0; color: #dc2626;">Error loading address description</p>
        </div>
      `;
      console.error('Addressd: Error fetching description:', error);
    }
  }

  // Initial fetch
  fetchDescription();
})(); 