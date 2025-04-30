const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    try {
        await client.connect();
        const db = client.db('geoguesser-miku');
        
        // Get random image
        if (event.path === '/get-random-image') {
            const images = await db.collection('images')
                .aggregate([{ $sample: { size: 1 } }])
                .toArray();

            if (!images.length) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'No images found' })
                };
            }

            // Don't send the correct answer in the initial response
            const { country, ...imageData } = images[0];
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(imageData)
            };
        }

        // Update user score
        if (event.path === '/update-score') {
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

            const { score, totalGuesses } = JSON.parse(event.body);
            
            // Update user's score
            await db.collection('users').updateOne(
                { _id: userData.userId },
                { 
                    $set: { 
                        score,
                        totalGuesses,
                        lastUpdated: new Date()
                    }
                }
            );

            // Get leaderboard
            const leaderboard = await db.collection('users')
                .find({}, { 
                    projection: { 
                        username: 1, 
                        score: 1, 
                        totalGuesses: 1 
                    }
                })
                .sort({ score: -1 })
                .limit(10)
                .toArray();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(leaderboard)
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Route not found' })
        };

    } catch (error) {
        console.error('Game error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    } finally {
        await client.close();
    }
};