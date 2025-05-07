const { getStore } = require('@netlify/blobs');
const jwt = require('jsonwebtoken');
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

// Helper to get a random item from an array
const getRandomItem = (array) => {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
};

exports.handler = async function(event, context) {
    console.log('Game Function Invoked');
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        console.log('Handling OPTIONS request');
        return { statusCode: 200, headers };
    }

    try {
        console.log('Request path:', event.path);
        
        // Connect to MongoDB
        const mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const db = mongoClient.db('miku-geoguesser');
        
        // Get blob store for images
        const imageStore = getStore({ name: 'miku-images' });
        
        // Get random image
        if (event.path.includes('/get-random-image')) {
            console.log('Getting random image');
            
            // Get a random image from MongoDB
            const mikuCollection = db.collection('miku-images');
            const count = await mikuCollection.countDocuments();
            
            if (count === 0) {
                console.log('No images found in MongoDB');
                await mongoClient.close();
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'No images found' })
                };
            }
            
            // Get a random image document
            const randomImage = await mikuCollection.aggregate([
                { $sample: { size: 1 } }
            ]).toArray();
            
            if (!randomImage || randomImage.length === 0) {
                console.log('Failed to retrieve random image');
                await mongoClient.close();
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Failed to retrieve image' })
                };
            }
            
            const imageMetadata = randomImage[0];
            console.log('Selected random image:', imageMetadata.imageId);
            
            // Get the image data from Netlify Blobs
            const imageData = await imageStore.get(imageMetadata.imageId, {
                type: 'arrayBuffer'
            });
            
            if (!imageData) {
                console.log('Image not found in blob storage for ID:', imageMetadata.imageId);
                await mongoClient.close();
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Image data not found' })
                };
            }
            
            // Convert the array buffer to base64 for sending to client
            const base64Image = Buffer.from(imageData).toString('base64');
            const dataUrl = `data:${imageMetadata.fileType};base64,${base64Image}`;
            
            await mongoClient.close();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    imageId: imageMetadata.imageId,
                    imageData: dataUrl,
                    metadata: {
                        country: imageMetadata.country,
                        artistCredit: imageMetadata.artistCredit,
                        submittedBy: imageMetadata.submittedBy
                    }
                })
            };
        }

        // Update user score
        if (event.path.includes('/update-score')) {
            console.log('Updating user score');
            
            const authHeader = event.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                await mongoClient.close();
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Unauthorized' })
                };
            }

            const token = authHeader.split(' ')[1];
            const userData = verifyToken(token);
            if (!userData) {
                await mongoClient.close();
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid token' })
                };
            }

            const { score, totalGuesses, imageId } = JSON.parse(event.body);
            const username = userData.username;
            
            // Get user collection
            const userCollection = db.collection('users');
            
            // Get current user data
            let user = await userCollection.findOne({ username });
            
            if (!user) {
                console.log('User not found, creating user record');
                user = {
                    username,
                    email: userData.email,
                    score: 0,
                    totalGuesses: 0,
                    createdAt: new Date()
                };
            }
            
            // Update score
            const updatedScore = Number(user.score || 0) + Number(score || 0);
            const updatedGuesses = Number(user.totalGuesses || 0) + Number(totalGuesses || 0);
            
            // Save updated user data
            await userCollection.updateOne(
                { username },
                { 
                    $set: {
                        score: updatedScore,
                        totalGuesses: updatedGuesses,
                        lastUpdated: new Date()
                    },
                    $setOnInsert: {
                        username,
                        email: userData.email,
                        createdAt: new Date()
                    }
                },
                { upsert: true }
            );
            
            // Record this score event
            const scoreCollection = db.collection('scores');
            await scoreCollection.insertOne({
                username,
                email: userData.email,
                score,
                imageId,
                timestamp: new Date()
            });
            
            // Get all users for leaderboard
            const leaderboard = await userCollection
                .find({}, { projection: { username: 1, score: 1, totalGuesses: 1, _id: 0 } })
                .sort({ score: -1 })
                .limit(10)
                .toArray();
            
            await mongoClient.close();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(leaderboard)
            };
        }

        await mongoClient.close();
        console.log('Route not found:', event.path);
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Route not found', path: event.path })
        };

    } catch (error) {
        console.error('Game error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error', 
                message: error.message 
            })
        };
    }
};