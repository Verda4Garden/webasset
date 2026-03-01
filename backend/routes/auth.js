const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    if (username === adminUsername && password === adminPassword) {
        const token = jwt.sign(
            { role: 'admin', username },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // Token expires in 8 hours
        );
        return res.json({ token, message: 'Login successful' });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
});

module.exports = router;
