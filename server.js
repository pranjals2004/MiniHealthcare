// --- 1. IMPORTS & INITIAL SETUP ---
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// --- 2. DATABASE CONNECTION ---
// Make sure you have MongoDB installed and running on your computer
const MONGO_URI = 'mongodb://localhost:27017/healthcareDB';

mongoose.connect(MONGO_URI)
    .then(() => console.log('Successfully connected to local MongoDB!'))
    .catch(err => console.error('Database connection error:', err));

// --- 3. DATABASE SCHEMA AND MODEL (for reports) ---
const reportSchema = new mongoose.Schema({
    originalName: String,
    uniqueName: String,
    reportType: String,
    notes: String,
    userEmail: String,
    uploadTimestamp: { type: Date, default: Date.now }
});

const Report = mongoose.model('Report', reportSchema);

// --- 4. FILE SYSTEM SETUP (for uploads) ---
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // We will save files into a user-specific folder
    const userEmail = req.body.userEmail;
    if (!userEmail) {
      return cb(new Error('User email not provided for upload destination!'), null);
    }
    const userFolder = userEmail.replace(/[@.]/g, '_'); // Sanitize email for folder name
    const finalUserPath = path.join(uploadsDir, userFolder);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(finalUserPath)) {
        fs.mkdirSync(finalUserPath, { recursive: true });
    }
    cb(null, finalUserPath);
  },
  filename: (req, file, cb) => {
    // Create a unique filename to avoid overwrites
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// --- 5. MIDDLEWARE CONFIGURATION ---
app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json()); // For appointment booking route
app.use(express.urlencoded({ extended: true })); // For file upload forms
app.use('/uploads', express.static('uploads')); // Serve uploaded files statically

// --- 6. API ROUTES ---

// ## ROUTE 1: BOOKING AN APPOINTMENT (from your old server.js) ##
// In server.js, update the ENTIRE app.post('/book-appointment', ...) route

app.post('/book-appointment', (req, res) => {
    // 1. Receive the NEW data from the form
    const { 
        first_name, 
        last_name, 
        email, 
        phone,
        doctor, 
        appointmentDate, 
        appointmentTime 
    } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'sharmapranjal80133@gmail.com',
            pass: 'jlqz wqms hlmo uucy'
        }
    });

    // 2. Use the NEW data in the mailOptions object
    const mailOptions = {
        from: '"HealthCare" <sharmapranjal80133@gmail.com>',
        to: email,
        subject: 'Appointment Confirmation with HealthCare',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h3>Appointment Confirmation</h3>
                <p>Dear ${first_name} ${last_name},</p>
                <p>This email is to confirm that your appointment has been successfully scheduled.</p>
                <hr>
                <p><strong>Doctor/Department:</strong> ${doctor}</p>
                <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-GB')}</p>
                <p><strong>Time:</strong> ${appointmentTime}</p>
                <p><strong>Location:</strong> HealthCare, NH-24 near new Metro Station Gate no.-2</p>
                <hr>
                <p>If you have any questions or need to reschedule, please call us at (+91) 6306019571.</p>
                <p>We look forward to seeing you.</p>
                <br>
                <p>Sincerely,</p>
                <p><strong>The Team at HealthCare</strong></p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ message: 'Error sending confirmation email.' });
        }
        res.status(200).json({ message: 'Appointment booked! A confirmation email has been sent.' });
    });
});

// ## ROUTE 2: UPLOADING A REPORT (from your new server.js) ##
app.post('/api/upload-report', upload.single('reportFile'), async (req, res) => {
    try {
        const { userEmail, reportType, notes } = req.body;
        const { originalname, filename: uniqueName } = req.file;

        if (!userEmail || !req.file) {
            return res.status(400).json({ message: 'Missing user email or file.' });
        }

        const newReport = new Report({
            originalName: originalname,
            uniqueName: uniqueName,
            reportType: reportType,
            notes: notes,
            userEmail: userEmail
        });
        await newReport.save();
        res.status(200).json({ message: 'File uploaded and data saved successfully!' });
    } catch (error) {
        console.error('Error during file upload or DB save:', error);
        res.status(500).json({ message: 'Server error during upload process.' });
    }
});


// ## ROUTE 3: GETTING A USER'S REPORTS (from your new server.js) ##
app.get('/api/get-my-reports', async (req, res) => {
    const userEmail = req.query.email;
    if (!userEmail) {
        return res.status(400).json({ message: 'User email is required.' });
    }

    try {
        const reports = await Report.find({ userEmail: userEmail }).sort({ uploadTimestamp: -1 });
        res.status(200).json(reports);
    } catch (error) {
        console.error('Error fetching reports from DB:', error);
        res.status(500).json({ message: 'Could not retrieve reports.' });
    }
});
// In server.js

// ## ROUTE 4: DELETING A SPECIFIC REPORT ##
app.delete('/api/delete-report/:id', async (req, res) => {
    try {
        const reportId = req.params.id;

        // 1. Find the report in the database to get its details
        const report = await Report.findById(reportId);

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        // 2. Construct the full path to the file on the server
        const userFolder = report.userEmail.replace(/[@.]/g, '_');
        const filePath = path.join(__dirname, 'uploads', userFolder, report.uniqueName);

        // 3. Delete the physical file from the server's file system
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath); // Use unlink to delete the file
        }

        // 4. Delete the report record from the MongoDB database
        await Report.findByIdAndDelete(reportId);

        // 5. Send a success response
        res.status(200).json({ message: 'Report deleted successfully.' });

    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ message: 'Server error while deleting report.' });
    }
});

// Add this new route to server.js

// ## ROUTE: DYNAMIC SERVICE BOOKING ##
app.post('/api/book-service', (req, res) => {
    // Destructure the common fields and collect all other fields into a 'details' object
    const { serviceTitle, fullName, email, phone, ...details } = req.body;

    // A helper function to format the keys from the form (e.g., "testType" -> "Test Type")
    const formatDetailKey = (key) => {
        return key
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
    };

    // Build an HTML list of all the specific details submitted by the user
    let detailsHtml = '<ul>';
    for (const [key, value] of Object.entries(details)) {
        if (value) { // Only include fields that have a value
            detailsHtml += `<li><strong>${formatDetailKey(key)}:</strong> ${value}</li>`;
        }
    }
    detailsHtml += '</ul>';

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'sharmapranjal80133@gmail.com',
            pass: 'jlqz wqms hlmo uucy'
        }
    });

    const mailOptions = {
        from: '"HealthCare" <sharmapranjal80133@gmail.com>',
        to: email,
        subject: `Booking Request for ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h3>Booking Request Received</h3>
                <p>Dear ${fullName},</p>
                <p>Thank you for your interest. We have received your booking request for the following service and will contact you shortly via phone at <strong>${phone}</strong> to confirm your appointment.</p>
                <hr>
                <h4>Booking Summary:</h4>
                <p><strong>Service:</strong> ${serviceTitle}</p>
                ${detailsHtml}
                <hr>
                <p>Thank you for choosing HealthCare.</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending dynamic service email:', error);
            return res.status(500).json({ message: 'Error sending confirmation email.' });
        }
        res.status(200).json({ message: 'Booking request received! A confirmation email has been sent.' });
    });
});

// --- 7. START THE SERVER ---
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});