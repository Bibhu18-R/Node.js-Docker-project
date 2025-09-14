require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Debug environment variables
console.log('Environment variables:');
console.log('APP_USERNAME:', process.env.APP_USERNAME ? `"${process.env.APP_USERNAME}"` : 'NOT SET');
console.log('APP_PASSWORD:', process.env.APP_PASSWORD ? '*** (set)' : 'NOT SET');
console.log('SECRET_MESSAGE:', process.env.SECRET_MESSAGE || 'NOT SET');
console.log('PORT:', port);

// Middleware to log all requests
app.use((req, res, next) => {
    console.log('\n=== NEW REQUEST ===');
    console.log('Time:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    next();
});

// Custom basic auth middleware
const authenticate = (req, res, next) => {
    console.log('\n--- AUTH PROCESS ---');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        console.log('❌ No authorization header found');
        res.set('WWW-Authenticate', 'Basic realm="Secure Area", charset="UTF-8"');
        return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Please provide username and password' 
        });
    }
    
    if (!authHeader.startsWith('Basic ')) {
        console.log('❌ Invalid auth header format');
        res.set('WWW-Authenticate', 'Basic realm="Secure Area", charset="UTF-8"');
        return res.status(401).json({ 
            error: 'Invalid authentication format',
            message: 'Use Basic Authentication' 
        });
    }
    
    // Extract and decode credentials
    try {
        const base64Credentials = authHeader.slice(6);
        console.log('Base64 credentials:', base64Credentials);
        
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        console.log('Decoded credentials:', credentials);
        
        const [username, password] = credentials.split(':');
        
        console.log('Received - Username:', `"${username}"`);
        console.log('Received - Password:', `"${password}"`);
        console.log('Expected - Username:', `"${process.env.APP_USERNAME}"`);
        console.log('Expected - Password:', `"${process.env.APP_PASSWORD}"`);
        
        if (!username || !password) {
            console.log('❌ Missing username or password');
            res.set('WWW-Authenticate', 'Basic realm="Secure Area", charset="UTF-8"');
            return res.status(401).json({ 
                error: 'Invalid credentials',
                message: 'Username and password required' 
            });
        }
        
        // Trim and compare
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();
        
        if (trimmedUsername === process.env.APP_USERNAME && trimmedPassword === process.env.APP_PASSWORD) {
            console.log('✅ Authentication successful!');
            return next();
        }
        
        console.log('❌ Authentication failed - credentials do not match');
        
    } catch (error) {
        console.log('❌ Error decoding credentials:', error.message);
    }
    
    res.set('WWW-Authenticate', 'Basic realm="Secure Area", charset="UTF-8"');
    return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Username or password is incorrect' 
    });
};

// Routes
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.get('/secret', authenticate, (req, res) => {
    res.json({
        message: 'Access granted!',
        secret: process.env.SECRET_MESSAGE || 'No secret message configured',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        auth: {
            username: process.env.APP_USERNAME,
            password_set: !!process.env.APP_PASSWORD,
            secret_message: !!process.env.SECRET_MESSAGE
        }
    });
});

// Test endpoint to see raw headers
app.get('/debug', (req, res) => {
    res.json({
        headers: req.headers,
        auth: req.headers.authorization,
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`\n🚀 Server running on http://localhost:${port}`);
    console.log(`📁 Public route: http://localhost:${port}/`);
    console.log(`🔒 Secret route: http://localhost:${port}/secret`);
    console.log(`❤️  Health check: http://localhost:${port}/health`);
    console.log(`🐛 Debug route: http://localhost:${port}/debug`);
    console.log('\n💡 Test with: curl -u admin:secret123 http://localhost:3000/secret');
});

module.exports = app;