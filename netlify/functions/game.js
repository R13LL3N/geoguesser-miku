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
        
        // Get blob stores
        const imageMetadataStore = getStore({ name: 'image-metadata' });
        const imageStore = getStore({ name: 'images' });
        const userStore = getStore({ name: 'users' });
        const scoreStore = getStore({ name: 'scores' });
        
        // Get random image
        if (event.path === '/get-random-image' || event.path.includes('/get-random-image')) {
            console.log('Getting random image');
            
            // List all metadata keys
            const metadataList = await imageMetadataStore.list();
            
            if (!metadataList || metadataList.length === 0) {
                console.log('No images found');
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'No images found' })
                };
            }
            
            // Pick a random key
            const randomKey = getRandomItem(metadataList);
            console.log('Selected random image:', randomKey);
            
            // Get the metadata and image data
            const metadata = await imageMetadataStore.get(randomKey);
            const imageData = await imageStore.get(randomKey);
            
            if (!metadata || !imageData) {
                console.log('Image or metadata missing for key:', randomKey);
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Image data not found' })
                };
            }
            
            // Don't send the exact coordinates in the initial response
            const { coordinates, ...safeMetadata } = metadata;
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    imageId: randomKey,
                    imageData,
                    metadata: safeMetadata
                })
            };
        }

        // Update user score
        if (event.path === '/update-score' || event.path.includes('/update-score')) {
            console.log('Updating user score');
            
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

            const { score, totalGuesses, imageId } = JSON.parse(event.body);
            const email = userData.email;
            
            // Get current user data
            let user;
            try {
                user = await userStore.get(email);
            } catch (error) {
                console.log('User not found, creating score record');
                user = {
                    email,
                    username: userData.username,
                    score: 0,
                    totalGuesses: 0,
                    createdAt: new Date().toISOString()
                };
            }
            
            // Update score
            const updatedUser = {
                ...user,
                score: Number(score) || 0,
                totalGuesses: Number(totalGuesses) || 0,
                lastUpdated: new Date().toISOString()
            };
            
            // Save updated user data
            await userStore.set(email, updatedUser);
            
            // Record this score event
            const scoreEvent = {
                email,
                username: userData.username,
                score,
                imageId,
                timestamp: new Date().toISOString()
            };
            
            const scoreId = `${Date.now()}-${email}`;
            await scoreStore.set(scoreId, scoreEvent);
            
            // Get all users for leaderboard
            const leaderboard = [];
            const userKeys = await userStore.list();
            
            for (const key of userKeys) {
                const userData = await userStore.get(key);
                if (userData && userData.score !== undefined) {
                    leaderboard.push({
                        username: userData.username,
                        score: userData.score,
                        totalGuesses: userData.totalGuesses
                    });
                }
            }
            
            // Sort leaderboard by score (descending)
            leaderboard.sort((a, b) => b.score - a.score);
            
            // Return top 10
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(leaderboard.slice(0, 10))
            };
        }

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