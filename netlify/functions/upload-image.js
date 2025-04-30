const { put } = require('@netlify/blobs');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');

const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

const client = new MongoClient(MONGODB_URI);

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Verify authentication
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    const token = authHeader.split(' ')[1];
    const userData = verifyToken(token);
    if (!userData) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Invalid token' })
        };
    }

    try {
        const formData = new FormData(event);
        const file = formData.get('file');
        const metadata = JSON.parse(formData.get('metadata'));

        if (!file || !metadata) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing file or metadata' })
            };
        }

        // Upload to Netlify Blob Storage
        const filename = `${Date.now()}-${file.name}`;
        await put(`images/${filename}`, file, {
            contentType: file.type,
            metadata
        });

        // Store metadata in MongoDB
        await client.connect();
        const db = client.db('geoguesser-miku');
        await db.collection('images').insertOne({
            filename,
            url: `/.netlify/blobs/images/${filename}`,
            ...metadata,
            uploadedBy: userData.userId,
            createdAt: new Date()
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Upload successful',
                filename
            })
        };
    } catch (error) {
        console.error('Upload error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Upload failed' })
        };
    } finally {
        await client.close();
    }
};