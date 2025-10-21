// --- 1. IMPORTS & INITIAL SETUP ---
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util'); // For making fs functions return promises

// Promisify fs functions we will use
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);

const app = express();
const port = 3000;

// --- 2. DATABASE CONNECTION ---
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
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// CORRECTED: Configure Multer to save to the main 'uploads' directory first.
// We will handle the user-specific subfolder logic inside the route handler.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Save directly to the main uploads folder
    },
    filename: (req, file, cb) => {
        // Create a unique filename to avoid overwrites
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// --- 5. MIDDLEWARE CONFIGURATION ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// --- 6. API ROUTES ---

// ## ROUTE 1: BOOKING AN APPOINTMENT ##
app.post('/book-appointment', (req, res) => {
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
            user: 'sharmapranjal80133@gmail.com', // Replace with your email
            pass: 'jlqz wqms hlmo uucy' // Replace with your app password
        }
    });

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


// ## ROUTE 2: UPLOADING A REPORT (CORRECTED LOGIC) ##
app.post('/api/upload-report', upload.single('reportFile'), async (req, res) => {
    try {
        // Now, req.body is fully available
        const { userEmail, reportType, notes } = req.body;
        const { originalname, filename: uniqueName, path: tempPath } = req.file;

        if (!userEmail || !req.file) {
            return res.status(400).json({ message: 'Missing user email or file.' });
        }

        // 1. Create the user-specific folder if it doesn't exist
        const userFolder = userEmail.replace(/[@.]/g, '_'); // Sanitize email
        const finalUserPath = path.join(uploadsDir, userFolder);
        if (!fs.existsSync(finalUserPath)) {
            await mkdir(finalUserPath, { recursive: true });
        }

        // 2. Move the file from the main 'uploads' dir to the user's folder
        const finalFilePath = path.join(finalUserPath, uniqueName);
        await rename(tempPath, finalFilePath);

        // 3. Save the report metadata to the database
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


// ## ROUTE 3: GETTING A USER'S REPORTS ##
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

// ## ROUTE 4: DELETING A SPECIFIC REPORT ##
app.delete('/api/delete-report/:id', async (req, res) => {
    try {
        const reportId = req.params.id;
        const report = await Report.findById(reportId);

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        const userFolder = report.userEmail.replace(/[@.]/g, '_');
        const filePath = path.join(__dirname, 'uploads', userFolder, report.uniqueName);

        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }

        await Report.findByIdAndDelete(reportId);
        res.status(200).json({ message: 'Report deleted successfully.' });

    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ message: 'Server error while deleting report.' });
    }
});


// ## ROUTE 5: DYNAMIC SERVICE BOOKING ##
app.post('/api/book-service', (req, res) => {
    const { serviceTitle, fullName, email, phone, ...details } = req.body;

    const formatDetailKey = (key) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    };

    let detailsHtml = '<ul>';
    for (const [key, value] of Object.entries(details)) {
        if (value) {
            detailsHtml += `<li><strong>${formatDetailKey(key)}:</strong> ${value}</li>`;
        }
    }
    detailsHtml += '</ul>';

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'sharmapranjal80133@gmail.com', // Replace with your email
            pass: 'jlqz wqms hlmo uucy' // Replace with your app password
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
