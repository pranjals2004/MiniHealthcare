document.addEventListener('DOMContentLoaded', () => {
    // --- 1. USER AUTHENTICATION & WELCOME MESSAGE ---
    const activeUserEmail = localStorage.getItem('activeUserEmail');
    const userNameElement = document.getElementById('user-name');
    
    // Redirect to login page if no user is active
    if (!activeUserEmail) {
        alert("You must be logged in to view the dashboard.");
        window.location.href = 'index.html'; 
        return; 
    }

    // Set the welcome message with the user's name
    const userDataString = localStorage.getItem(activeUserEmail);
    if (userDataString && userNameElement) {
        const userData = JSON.parse(userDataString);
        userNameElement.textContent = userData.name;
    }

    // --- 2. LOGOUT FUNCTIONALITY ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault(); 
            localStorage.removeItem('activeUserEmail');
            alert("You have been logged out.");
            window.location.href = 'index.html'; 
        });
    }

    // --- 3. DYNAMIC FORM LOGIC (Show/Hide specific fields) ---
    const reportTypeSelect = document.getElementById('report-type');
    const specificFields = document.querySelectorAll('.specific-fields');

    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', (event) => {
            const selectedType = event.target.value;

            // First, hide all specific field containers
            specificFields.forEach(field => {
                field.style.display = 'none';
            });

            // Now, show the relevant container based on selection
            switch (selectedType) {
                case 'Blood Test (CBC)':
                    document.getElementById('blood-test-fields').style.display = 'block';
                    break;
                case 'X-Ray':
                case 'CT Scan':
                case 'MRI':
                case 'Ultrasound':
                    document.getElementById('imaging-fields').style.display = 'block';
                    break;
                case 'Prescription':
                    document.getElementById('prescription-fields').style.display = 'block';
                    break;
                case 'Other':
                    document.getElementById('other-report-group').style.display = 'block';
                    break;
            }
        });
    }

    // --- 4. FORM SUBMISSION (UPLOAD REPORT) ---
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const statusMessage = document.getElementById('status-message');
            statusMessage.textContent = 'Uploading report...';
            statusMessage.style.color = '#333'; // Reset color

            const formData = new FormData(reportForm);
            formData.append('userEmail', activeUserEmail);

            try {
                const response = await fetch('http://localhost:3000/api/upload-report', {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    statusMessage.textContent = 'Report uploaded successfully!';
                    statusMessage.style.color = 'green';
                    reportForm.reset();
                    // Hide all specific fields again after a successful submission
                    specificFields.forEach(field => {
                        field.style.display = 'none';
                    });
                    fetchAndDisplayReports(); // Refresh the list
                } else {
                    const errorData = await response.json();
                    statusMessage.textContent = `Upload failed: ${errorData.message || 'Server error'}`;
                    statusMessage.style.color = 'red';
                }
            } catch (error) {
                console.error('Submission error:', error);
                statusMessage.textContent = 'An error occurred during submission.';
                statusMessage.style.color = 'red';
            }
        });
    }

    // --- 5. FETCH AND DISPLAY UPLOADED REPORTS ---
    const reportsListContainer = document.getElementById('reports-list');

    async function fetchAndDisplayReports() {
        if (!activeUserEmail) return;
        
        try {
            const response = await fetch(`http://localhost:3000/api/get-my-reports?email=${activeUserEmail}`);
            if (!response.ok) {
                throw new Error('Failed to fetch reports');
            }
            const reports = await response.json();

            reportsListContainer.innerHTML = ''; // Clear previous list

            if (reports.length === 0) {
                reportsListContainer.innerHTML = '<p>You have not uploaded any reports yet.</p>';
                return;
            }

            const userFolder = activeUserEmail.replace(/[@.]/g, '_');
            reports.forEach(report => {
                const fileExt = report.originalName.split('.').pop().toLowerCase();
                const fileUrl = `http://localhost:3000/uploads/${userFolder}/${report.uniqueName}`;
                
                const itemContainer = document.createElement('div');
                itemContainer.className = 'report-item';

                let previewHtml = '';
                if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
                    previewHtml = `<a href="${fileUrl}" target="_blank"><img src="${fileUrl}" alt="${report.originalName}" class="report-thumbnail"></a>`;
                } else {
                    previewHtml = `<a href="${fileUrl}" target="_blank" class="file-icon"><i class="ri-file-text-line"></i></a>`; // Assuming you have Remix Icon or similar
                }

                itemContainer.innerHTML = `
                    ${previewHtml}
                    <div class="report-info">
                        <p class="report-name" title="${report.originalName}">${report.originalName}</p>
                        <p class="report-type">${report.reportType}</p>
                        <p class="report-date">Uploaded on: ${new Date(report.uploadTimestamp).toLocaleDateString()}</p>
                    </div>
                    <button class="delete-btn" data-id="${report._id}">Delete</button>
                `;
                reportsListContainer.appendChild(itemContainer);
            });
        } catch (error) {
            console.error('Error fetching reports:', error);
            reportsListContainer.innerHTML = '<p style="color: red;">Could not load your reports. Please try again later.</p>';
        }
    }

    // --- 6. DELETE REPORT FUNCTIONALITY (EVENT DELEGATION) ---
    // --- 6. DELETE REPORT FUNCTIONALITY (EVENT DELEGATION) ---
    if (reportsListContainer) {
        reportsListContainer.addEventListener('click', async (event) => {
            // Only proceed if a delete button was clicked
            if (event.target.classList.contains('delete-btn')) {
                const reportId = event.target.dataset.id;
                
                // Ask for user confirmation
                if (confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
                    try {
                        // 1. CORRECTED THE URL HERE
                        const response = await fetch(`http://localhost:3000/api/delete-report/${reportId}`, {
                            method: 'DELETE',
                        });

                        if (response.ok) {
                            alert('Report deleted successfully.');
                            // 2. IMPROVEMENT: Remove the item directly from the page for a smoother experience
                            event.target.closest('.report-item').remove();
                        } else {
                            // If the server sends an error, show it
                            const errorData = await response.json();
                            alert(`Failed to delete report: ${errorData.message}`);
                        }
                    } catch (error) {
                        console.error('Error deleting report:', error);
                        alert('An error occurred while trying to delete the report.');
                    }
                }
            }
        });
    }
    // --- INITIAL CALL TO LOAD REPORTS WHEN PAGE OPENS ---
    fetchAndDisplayReports();
});