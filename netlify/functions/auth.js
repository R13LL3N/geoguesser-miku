const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Create a MongoDB client outside the handler for connection reuse
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    // For newer MongoDB driver versions, use the connection string directly
    console.log('Initializing MongoDB connection...');
    const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000 // 10 second timeout
    });

    try {
        await client.connect();
        console.log('Connected to MongoDB successfully');
        const db = client.db('geoguesser-miku');
        cachedDb = { client, db };
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

exports.handler = async function(event, context) {
    // Tell Netlify not to close the connection immediately
    context.callbackWaitsForEmptyEventLoop = false;
    
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        const { db } = await connectToDatabase();
        const users = db.collection('users');
        
        const { path } = event;
        const body = JSON.parse(event.body);
        
        console.log('Path:', path);
        console.log('Request body:', JSON.stringify(body));

        // Handle login
        if (path === '/api/login' || path === '/login') {
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
        if (path === '/api/signup' || path === '/signup') {
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
            body: JSON.stringify({ error: 'Route not found', path: path })
        };

    } catch (error) {
        console.error('Auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error', 
                message: error.message,
                stack: error.stack
            })
        };
    }
};