document.addEventListener('DOMContentLoaded', () => {
    // --- 1. LOGIN/REGISTER MODAL LOGIC ---
    const authModal = document.getElementById('authModal');
    const loginBtn = document.getElementById('loginBtn');
    const closeAuthBtn = document.getElementById('closeAuthBtn');
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const loginToggle = document.getElementById("loginToggle");
    const registerToggle = document.getElementById("registerToggle");

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            authModal.style.display = 'flex';
        });
    }

    if (closeAuthBtn) {
        closeAuthBtn.addEventListener('click', () => {
            authModal.style.display = 'none';
        });
    }

    if (loginToggle) {
        loginToggle.addEventListener('click', () => {
            loginForm.classList.add("active");
            registerForm.classList.remove("active");
            loginToggle.classList.add("active");
            registerToggle.classList.remove("active");
        });
    }
    if (registerToggle) {
        registerToggle.addEventListener('click', () => {
            loginForm.classList.remove("active");
            registerForm.classList.add("active");
            loginToggle.classList.remove("active");
            registerToggle.classList.add("active");
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = registerForm.querySelector('input[type="text"]').value;
            const email = registerForm.querySelector('input[type="email"]').value;
            const password = registerForm.querySelector('input[type="password"]').value;

            if (localStorage.getItem(email)) {
                alert("An account with this email already exists!");
                return;
            }

            const userData = { name, password };
            localStorage.setItem(email, JSON.stringify(userData));
            alert("Registration successful! Please log in.");
            registerForm.reset();
            loginToggle.click();
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            const storedUserData = localStorage.getItem(email);

            if (!storedUserData) {
                alert("No account found with this email. Please register.");
                return;
            }

            const userData = JSON.parse(storedUserData);

            if (userData.password === password) {
                alert(`Welcome back, ${userData.name}!`);
                localStorage.setItem('activeUserEmail', email);
                window.location.href = 'dashboard.html';
            } else {
                alert("Incorrect password. Please try again.");
            }
        });
    }


    // --- 2. BOOKING MODAL LOGIC ---
    const bookingModal = document.getElementById('bookingModal');
    const closeBookingBtn = document.getElementById('closeBookingBtn');
    const bookingServiceTitle = document.getElementById('bookingServiceTitle');
    const bookingForm = document.getElementById('bookingForm');
    const bookingFormFields = document.getElementById('booking-form-fields');
    const bookButtons = document.querySelectorAll('.book-btn');

    // =====================================================================
    // == MODIFIED: Function to Generate Dynamic Form Fields
    // =====================================================================
    function generateFormFields(serviceType) {
        // Common fields for all forms
        const commonFields = `
            <div class="form-group">
                <label for="fullName">Full Name</label>
                <input type="text" id="fullName" name="fullName" placeholder="Enter your full name" required>
            </div>
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" placeholder="Enter your email for confirmation" required>
            </div>
            <div class="form-group">
                <label for="phone">Phone Number</label>
                <input type="tel" id="phone" name="phone" placeholder="Enter your 10-digit phone number" required pattern="[6-9]\\d{9}" title="Please enter a valid 10-digit mobile number.">
            </div>
        `;

        let specificFields = '';

        // Generate specific fields based on the service type
        switch (serviceType) {
            case 'lab_test':
                specificFields = `
                    <div class="form-group">
                        <label for="testType">Select Test</label>
                        <select id="testType" name="testType" required>
                            <option value="">--Please choose a test--</option>
                            <option value="cbc">Complete Blood Count (CBC)</option>
                            <option value="lipid">Lipid Profile</option>
                            <option value="thyroid">Thyroid Function Test</option>
                            <option value="diabetes">Diabetes Screening</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="preferredDate">Preferred Date</label>
                        <input type="date" id="preferredDate" name="preferredDate" required>
                    </div>
                `;
                break;

            case 'checkup':
                specificFields = `
                    <div class="form-group">
                        <label for="packageType">Select Health Package</label>
                        <select id="packageType" name="packageType" required>
                            <option value="">--Please choose a package--</option>
                            <option value="basic">Basic Health Checkup</option>
                            <option value="advanced">Advanced Health Checkup</option>
                            <option value="senior">Senior Citizen Package</option>
                            <option value="women">Women's Wellness Package</option>
                        </select>
                    </div>
                     <div class="form-group">
                        <label for="preferredDate">Preferred Date</label>
                        <input type="date" id="preferredDate" name="preferredDate" required>
                    </div>
                `;
                break;
            
            case 'consultation':
                 specificFields = `
                    <div class="form-group">
                        <label for="preferredDate">Preferred Date</label>
                        <input type="date" id="preferredDate" name="preferredDate" required>
                    </div>
                    <div class="form-group">
                        <label for="preferredTime">Preferred Time</label>
                        <input type="time" id="preferredTime" name="preferredTime" required>
                    </div>
                    <div class="form-group">
                        <label for="reason">Reason for Visit (Optional)</label>
                        <textarea id="reason" name="reason" rows="3" placeholder="Briefly describe your symptoms or reason for consultation..."></textarea>
                    </div>
                `;
                break;

            default: // For 'default' services like Pediatrics, Orthopedics
                specificFields = `
                    <div class="form-group">
                        <label for="preferredDate">Preferred Date</label>
                        <input type="date" id="preferredDate" name="preferredDate" required>
                    </div>
                    <div class="form-group">
                        <label for="preferredTime">Preferred Time</label>
                        <input type="time" id="preferredTime" name="preferredTime" required>
                    </div>
                `;
                break;
        }

        return commonFields + specificFields;
    }

    bookButtons.forEach(button => {
        button.addEventListener('click', () => {
            const serviceCard = button.closest('.detailed-service-card');
            const serviceTitle = serviceCard.querySelector('h4').textContent;
            const serviceType = serviceCard.dataset.formType;
            
            // Set the modal title and generate the correct form
            bookingServiceTitle.textContent = serviceTitle;
            bookingFormFields.innerHTML = generateFormFields(serviceType);
            
            const today = new Date().toISOString().split('T')[0];
            const dateInputsInModal = bookingFormFields.querySelectorAll('input[type="date"]');
            dateInputsInModal.forEach(input => input.setAttribute('min', today));

            // Display the modal
            bookingModal.style.display = 'flex';
        });
    });

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Booking...';

            const formData = new FormData(bookingForm);
            // Add the main service title to our data
            formData.append('serviceTitle', bookingServiceTitle.textContent);
            
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('http://localhost:3000/api/book-service', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'An unknown error occurred.');
                }

                alert(result.message); // Show success message
                bookingModal.style.display = 'none';
                bookingForm.reset();

            } catch (error) {
                console.error('Booking submission error:', error);
                alert(`Booking failed: ${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Confirm Booking';
            }
        });
    }

    if (closeBookingBtn) {
        closeBookingBtn.addEventListener('click', () => {
            bookingModal.style.display = 'none';
        });
    }

    // --- 3. EMERGENCY MODAL LOGIC ---
    const emergencyModal = document.getElementById('emergencyModal');
    const emergencyBtn = document.getElementById('emergency-btn');
    const closeEmergencyBtn = document.getElementById('closeEmergencyBtn');

    if (emergencyBtn) {
        emergencyBtn.addEventListener('click', () => {
            emergencyModal.style.display = 'flex';
        });
    }

    if (closeEmergencyBtn) {
        closeEmergencyBtn.addEventListener('click', () => {
            emergencyModal.style.display = 'none';
        });
    }

    // --- 4. GENERAL MODAL BEHAVIOR ---
    window.addEventListener('click', (e) => {
        if (e.target === authModal) authModal.style.display = 'none';
        if (e.target === bookingModal) bookingModal.style.display = 'none';
        if (e.target === emergencyModal) emergencyModal.style.display = 'none';
    });
});