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
          <div class="addressd-content">
            <p>${data.description}</p>
            <small>Powered by <a href="${baseUrl}" target="_blank">addressd</a></small>
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