#!/usr/bin/env node
const http = require('https'); // Change to http for prod
const fs = require('fs');
const Database = require('better-sqlite3'); // I am developing on a windows ARM machine, and it does not really support sqlite3
const db = new Database('mydb.sqlite');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const express = require('express');
const bcrypt = require('bcryptjs');
const WebSocket = require('ws')


// Creating the users table
db.prepare(`CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT
)`).run();

// Creating the notes table that uses the username as a reference
db.prepare(`CREATE TABLE IF NOT EXISTS notes (
    note_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    note_title TEXT,
    note_content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users (username)
)`).run();

// Creating table for our global notes
db.prepare(`CREATE TABLE IF NOT EXISTS globalNotes (
    username TEXT,
    note TEXT
)`).run();


const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../html')));
app.use(cors());


// Load SSL certificates
// Comment this out for production
const options = {
    key: fs.readFileSync('ssl/key.pem'),
    cert: fs.readFileSync('ssl/cert.pem')
};

// This wont work locally becuase it requires https to be sent, and does not work with http-server
// Authentication middleware
const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: "Token missing" });

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, 'secret-key'); 
        req.username = decoded.username; 
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};


function generateJWT(user) {
    const payload = { username: user.username }; // Payload with user info
    const secret = 'secret-key'; // Use an environment variable for production
    const options = { expiresIn: '1h' }; // Token expiration 

    // Generate and return the JWT
    return jwt.sign(payload, secret, options);
}


// Function that lets a user signup, hashes/salts password then creates a new user in db. 
app.post('/api/signup', async (req, res) => {
    // Getting the username and pass form frontend, then checking to make sure its there
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Need to provide username and password.' });
    }

    // Open up the database, then check if the specific user is aleady there. 
    const getUser = db.prepare('SELECT * FROM users WHERE username = ?');
    const existingUser = getUser.get(username);
    
    if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
    }

    // Salting and hashing the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get DB ready to add a new user
    const insertUser = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    try {
        insertUser.run(username, hashedPassword);
        return res.status(201).json({ message: 'User created!' });
    } catch {
        console.error(error);
        return res.status(500).json({ message: 'Error occured while adding to user. '});
    }
});


app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const getUser = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = getUser.get(username);

    // Check is username and password exist/match
    if (user && await bcrypt.compare(password, user.password)) {
        // Generate json web token
        const token = generateJWT(user);

        res.status(200).json({
            message: 'Login successful',
            token: token, // Send back the token
        });
    } else {
        res.status(401).json({
            message: 'Invalid username or password',
        });
    }
});



//Adding a global note
app.post('/api/global', auth, (req, res) => {


    const { globalNote } = req.body;

    const { username } = req;

    console.log(globalNote, username);
    const insertNote = db.prepare('INSERT INTO globalNotes (username, note) VALUES (?, ?)');

    insertNote.run(username, globalNote);

    const getNotes = db.prepare('SELECT username, note FROM globalNotes');
    const notes = getNotes.all();

    wsserver.clients.forEach(ws => ws.send(JSON.stringify({
        type: 'newNote',
        note: notes
    })));
});

//I cant get authorization using the token becuase http-server is http not https
app.post('/api', auth, (req, res) => {
    console.log("Auth worked. ")

    const { title, note } = req.body;

    const { username } = req;

    const inserNote = db.prepare('INSERT INTO notes (username, note_title, note_content) VALUES (?, ?, ?)');

    try {
        inserNote.run(username, title, note);
        return res.status(201).json({ message: 'Note created successfully!' });
    } catch (err) {
        console.error(error);
        return res.status(500).json({ message: 'Error occurred while adding the note.' });
    }
});

app.get('/api', auth, (req, res) => {
    const { username } = req;

    // Fetch all notes for the authenticated user from the database
    const getNotes = db.prepare('SELECT note_id, note_title, note_content, created_at FROM notes WHERE username = ? ORDER BY created_at DESC');
    const notes = getNotes.all(username);

    // Return the notes in the response
    res.status(200).json({ notes });
});

// I could not re-use the auth function from before becuase I had to send the token as a query param, wss doesnt allow custom headers
function ws_auth(ws, req) {
    // Extracting token from url
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) return false; // Making sure token exists

    try{
        // If it doesnt exists it throws an error returning false
        const decoded = jwt.verify(token, 'secret-key');
        return true;
    } catch (err) {
        return false;
    }
};

// Start HTTPS Server
const server = http.createServer(options, app).listen(3000, () => console.log("Server running on https://localhost:3000"));
// Uncomment this line for production and comment the line above.
// const server = http.createServer(app).listen(3000, () => console.log("Server running on https://localhost:3000"));
const wsserver = new WebSocket.WebSocketServer({ server });
wsserver.on('connection', (ws, req) => {
    // Check if authorized using function above
    if (!ws_auth(ws, req)) return;
    console.log('Client Connected');
    ws.send(JSON.stringify('hi'));
});