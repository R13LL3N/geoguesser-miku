const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const client = new MongoClient(uri);

exports.handler = async function(event, context) {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        await client.connect();
        const db = client.db('geoguesser-miku');
        const users = db.collection('users');
        
        const { path } = event;
        const body = JSON.parse(event.body);

        // Handle login
        if (path === '/login') {
            const user = await users.findOne({ email: body.email });
            
            if (!user || !await bcrypt.compare(body.password, user.password)) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid credentials' })
                };
            }

            const token = jwt.sign(
                { userId: user._id, email: user.email },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    token,
                    username: user.username
                })
            };
        }

        // Handle signup
        if (path === '/signup') {
            // Check if user exists
            const existingUser = await users.findOne({
                $or: [
                    { email: body.email },
                    { username: body.username }
                ]
            });

            if (existingUser) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'User already exists' })
                };
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(body.password, 10);
            await users.insertOne({
                email: body.email,
                password: hashedPassword,
                username: body.username,
                createdAt: new Date()
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'User created successfully' })
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Route not found' })
        };

    } catch (error) {
        console.error('Auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    } finally {
        await client.close();
    }
};