const { getStore } = require('@netlify/blobs');
const jwt = require('jsonwebtoken');
const busboy = require('busboy');
const { MongoClient } = require('mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';
const MONGODB_URI = process.env.MONGODB_URI;

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
};

// Parse multipart form data
const parseMultipartForm = (event) => {
    return new Promise((resolve, reject) => {
        const fields = {};
        let fileBuffer = null;
        let fileName = '';
        let fileType = '';

        // Create busboy instance
        const bb = busboy({ 
            headers: event.headers,
            limits: {
                fileSize: 5 * 1024 * 1024 // 5MB
            }
        });

        // Handle file upload
        bb.on('file', (name, file, info) => {
            const { filename, encoding, mimeType } = info;
            console.log(`File [${name}]: filename: ${filename}, encoding: ${encoding}, mimeType: ${mimeType}`);
            
            // Only accept image files
            if (!mimeType.startsWith('image/')) {
                return reject(new Error('Only image files are allowed'));
            }
            
            fileName = filename;
            fileType = mimeType;
            
            const chunks = [];
            file.on('data', (data) => {
                chunks.push(data);
            });
            file.on('end', () => {
                fileBuffer = Buffer.concat(chunks);
                console.log(`File [${name}] done: ${fileBuffer.length} bytes`);
            });
        });

        // Handle regular form fields
        bb.on('field', (name, val) => {
            console.log(`Field [${name}]: value: ${val}`);
            if (name === 'metadata') {
                try {
                    fields[name] = JSON.parse(val);
                } catch (e) {
                    fields[name] = val;
                }
            } else {
                fields[name] = val;
            }
        });

        // Handle completion
        bb.on('finish', () => {
            resolve({
                fields,
                file: fileBuffer ? {
                    content: fileBuffer,
                    name: fileName,
                    type: fileType
                } : null
            });
        });

        // Handle error
        bb.on('error', (error) => {
            reject(error);
        });

        // Pipe the request to busboy
        const buffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
        bb.write(buffer);
        bb.end();
    });
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
        // Parse the multipart form data
        const formData = await parseMultipartForm(event);

        if (!formData.file || !formData.fields.metadata) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing image data or metadata' })
            };
        }

        // Get the blob store
        const imageStore = getStore({ name: 'miku-images' });
        
        // Generate a unique ID for the image
        const imageId = `${Date.now()}-${formData.fields.metadata.country || 'unknown'}-${userData.username}`;
        
        // Store the image in Netlify Blobs
        await imageStore.set(imageId, formData.file.content, {
            contentType: formData.file.type,
            metadata: {
                fileName: formData.file.name
            }
        });

        // Connect to MongoDB for storing metadata
        const mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const db = mongoClient.db('miku-geoguesser');
        const mikuCollection = db.collection('miku-images');

        // Prepare metadata for MongoDB
        const metadata = {
            imageId,
            fileName: formData.file.name,
            fileType: formData.file.type,
            country: formData.fields.metadata.country,
            isOwnWork: formData.fields.metadata.isOwnWork,
            artistCredit: formData.fields.metadata.artistCredit,
            submittedBy: userData.username,
            createdAt: new Date()
        };

        // Store metadata in MongoDB
        await mikuCollection.insertOne(metadata);
        
        // Close MongoDB connection
        await mongoClient.close();

        console.log('Image uploaded successfully:', imageId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Upload successful',
                imageId,
                metadata
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