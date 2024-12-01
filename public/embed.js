(function() {
  const container = document.getElementById('addressd-embed');
  const token = document.currentScript.dataset.token;
  const addressId = document.currentScript.dataset.address;
  const baseUrl = 'https://addressd.vercel.app';

  function createEditInterface(currentDescription) {
    return `
      <div class="addressd-edit">
        <textarea class="addressd-textarea">${currentDescription}</textarea>
        <button class="addressd-submit">Update Description</button>
      </div>
    `;
  }

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
            <div class="addressd-controls">
              <button class="addressd-edit-btn">Edit Description</button>
              <small>Powered by <a href="${baseUrl}" target="_blank">addressd</a></small>
            </div>
            ${createEditInterface(data.description)}
          </div>
        `;

        // Add event listeners
        const editBtn = container.querySelector('.addressd-edit-btn');
        const editInterface = container.querySelector('.addressd-edit');
        const submitBtn = container.querySelector('.addressd-submit');
        const textarea = container.querySelector('.addressd-textarea');

        editBtn.addEventListener('click', () => {
          editInterface.style.display = 'block';
          editBtn.style.display = 'none';
        });

        submitBtn.addEventListener('click', async () => {
          const newDescription = textarea.value.trim();
          if (!newDescription) return;

          try {
            const updateResponse = await fetch(`${baseUrl}/api/address/contribute`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                address: addressId,
                description: newDescription
              })
            });

            if (updateResponse.ok) {
              editInterface.style.display = 'none';
              editBtn.style.display = 'block';
              fetchDescription(); // Refresh the display
            } else {
              alert('Failed to update description');
            }
          } catch (error) {
            alert('Error updating description');
          }
        });
      } else {
        container.innerHTML = 'Unable to load address description';
      }
    } catch (error) {
      container.innerHTML = 'Error loading address description';
    }
  }

  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    .addressd-content {
      padding: 1rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .addressd-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
    }
    .addressd-edit {
      display: none;
      margin-top: 1rem;
    }
    .addressd-textarea {
      width: 100%;
      min-height: 100px;
      margin-bottom: 0.5rem;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .addressd-submit {
      background: #4a90e2;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .addressd-edit-btn {
      background: none;
      border: 1px solid #4a90e2;
      color: #4a90e2;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(styles);

  // Initial fetch
  fetchDescription();

  // Set up real-time updates (poll every 5 minutes)
  setInterval(fetchDescription, 5 * 60 * 1000);
})(); 