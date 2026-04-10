const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const con = require('./DB_Conn.js'); // DB connection module

const app = express();
const publicpath = path.join(__dirname, 'public');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicpath));

// Set up Multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, publicpath);  // Save directly to /public
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Routes
app.get('/Home', (req, res) => {
  res.sendFile(path.join(publicpath, 'home.html'));
});

app.get('/Login', (req, res) => {
  res.sendFile(path.join(publicpath, 'Login.html'));
});

app.get('/Registration', (req, res) => {
  res.sendFile(path.join(publicpath, 'Registration.html'));
});

app.post('/RegistrationValidation', (req, res) => {
  const { name, email, psw, cpass, place, phone } = req.body;

  if (psw !== cpass) {
    return res.status(400).send('Passwords do not match');
  }

  bcrypt.hash(psw, 10, (err, hashedPassword) => {
    if (err) return res.status(500).send('Encryption error');

    const sql = "INSERT INTO user (name, email, password, place, phone) VALUES (?, ?, ?, ?, ?)";
    const values = [name, email, hashedPassword, place, phone];

    con.query(sql, values, (err, result) => {
  if (err) {
    console.error('MySQL error during registration:', err); // Add this
    return res.status(500).send('Database error');
  }
  res.redirect('/Login');
});

  });
});

app.post('/LoginValidation', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM user WHERE email = ?';

  con.query(sql, [username], function (err, result) {
    if (err) return res.status(500).send('Database error');
    if (result.length === 0) return res.status(401).send('Invalid email or password');

    bcrypt.compare(password, result[0].password, (err, isMatch) => {
      if (err) return res.status(500).send('Encryption error');
      if (isMatch) res.sendFile(path.join(publicpath, 'main1.html'));
      else res.status(401).send('Invalid email or password');
    });
  });
});

// Booking route with amount calculation
app.post('/book', (req, res) => {
  const { fullName, phone, email, members, hotel } = req.body;
  const amountPerPerson = 1000;
  const totalAmount = parseInt(members) * amountPerPerson;

  const sql = `INSERT INTO bookings (full_name, phone, email, members, hotel, amount) VALUES (?, ?, ?, ?, ?, ?)`;
  const values = [fullName, phone, email, members, hotel, totalAmount];

  con.query(sql, values, (err, result) => {
    if (err) return res.status(500).send('Booking failed');
    res.redirect(`/payment.html?amount=${totalAmount}`);
  });
});

// Payment success with image upload
app.post('/paymentSuccess', upload.single('paymentProof'), (req, res) => {
  const amount = req.body.amount;
  const paymentProofPath = req.file ? `/uploads/${req.file.filename}` : '';

  const sql = "INSERT INTO payments (amount, proof_path) VALUES (?, ?)";
  con.query(sql, [amount, paymentProofPath], (err, result) => {
    if (err) {
      console.error("Error inserting payment data:", err);
      return res.status(500).send("Payment failed.");
    }
    res.redirect('/success.html');
  });
});

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(publicpath, 'Pagenotfound.html'));
});

app.listen(6500, () => {
  console.log('Server running on port 6500');
});
