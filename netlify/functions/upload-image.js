const { getStore } = require('@netlify/blobs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
};

exports.handler = async function(event, context) {
    console.log('Upload Image Function Invoked');
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        console.log('Handling OPTIONS request');
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
        // Parse request body
        const body = JSON.parse(event.body);
        const { imageData, metadata } = body;

        if (!imageData || !metadata) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing image data or metadata' })
            };
        }

        // Get the blob stores
        const imageStore = getStore({ name: 'images' });
        const metadataStore = getStore({ name: 'image-metadata' });

        // Generate a unique ID for the image
        const imageId = `${Date.now()}-${metadata.location || 'unknown'}-${userData.email}`;
        
        // Store the image data
        await imageStore.set(imageId, imageData);
        
        // Store the metadata separately
        const imageMetadata = {
            imageId,
            location: metadata.location,
            description: metadata.description,
            coordinates: metadata.coordinates,
            uploadedBy: userData.email,
            username: userData.username,
            createdAt: new Date().toISOString()
        };
        
        await metadataStore.set(imageId, imageMetadata);

        console.log('Image uploaded successfully:', imageId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Upload successful',
                imageId,
                metadata: imageMetadata
            })
        };
    } catch (error) {
        console.error('Upload error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Upload failed',
                message: error.message 
            })
        };
    }
};