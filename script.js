document.addEventListener('DOMContentLoaded', () => {
    // Set minimum date for the main appointment form on index.html
    const today = new Date().toISOString().split('T')[0];
    const mainAppointmentDateInput = document.querySelector('#appointmentForm input[name="appointmentDate"]');
    
    if (mainAppointmentDateInput) {
        mainAppointmentDateInput.setAttribute('min', today);
    }
});
// Modal elements
const modal = document.getElementById("authModal");
const loginBtn = document.querySelector("nav .btn"); // Navbar Login button
const closeBtn = document.querySelector(".close");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginToggle = document.getElementById("loginToggle");
const registerToggle = document.getElementById("registerToggle");

// --- Modal and Toggle Logic ---

// Open modal
loginBtn.addEventListener("click", () => {
  modal.style.display = "flex";
  showLogin();
});

// Close modal
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// Close if clicked outside modal
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// Toggle between Login/Register
loginToggle.addEventListener("click", showLogin);
registerToggle.addEventListener("click", showRegister);

function showLogin() {
  loginForm.classList.add("active");
  registerForm.classList.remove("active");
  loginToggle.classList.add("active");
  registerToggle.classList.remove("active");
}

function showRegister() {
  loginForm.classList.remove("active");
  registerForm.classList.add("active");
  loginToggle.classList.remove("active");
  registerToggle.classList.add("active");
}

// --- Form Submission Logic ---

// Handle Registration
registerForm.addEventListener('submit', (e) => {
  e.preventDefault(); 
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }
  if (localStorage.getItem(email)) {
    alert("An account with this email already exists!");
    return;
  }
  
  const userData = { name, password };
  localStorage.setItem(email, JSON.stringify(userData));
  
  alert("Registration successful! Please log in.");
  registerForm.reset();
  showLogin();
});

// Handle Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); 
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const storedUserData = localStorage.getItem(email);
    if (!storedUserData) {
        alert("No account found with this email. Please register.");
        return; 
    }
    
    const userData = JSON.parse(storedUserData);
    
    // Check Password
    if (userData.password === password) {
        alert(`Welcome back, ${userData.name}!`);

        // 1. Store the logged-in user's email to track the "session"
        localStorage.setItem('activeUserEmail', email);

        // 2. Redirect to the dashboard page
        window.location.href = 'dashboard.html';

    } else {
        alert("Incorrect password. Please try again.");
    }
});
// Add this new code to the end of your script.js file

// --- Appointment Form Submission Logic ---
const appointmentForm = document.getElementById('appointmentForm');

appointmentForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent the form from submitting the old way

    const submitButton = appointmentForm.querySelector('.form__btn');
    submitButton.disabled = true;
    submitButton.textContent = 'Booking...';

    // Create a FormData object to easily collect all form fields
    const formData = new FormData(appointmentForm);
    const data = Object.fromEntries(formData.entries());

    try {
        // Send the data to your new backend server endpoint
        const response = await fetch('http://localhost:3000/book-appointment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            appointmentForm.reset(); // Clear the form
        } else {
            throw new Error(result.message || 'Something went wrong.');
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to book appointment. Please try again later.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Book Appointment';
    }
});