const { MongoClient } = require('mongodb');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    // Log the MongoDB URI (with password masked)
    const uri = process.env.MONGODB_URI;
    console.log('MongoDB URI:', uri ? 
      uri.replace(/:([^@]+)@/, ':******@') : 
      'MONGODB_URI is not defined');

    // Try to connect to MongoDB
    console.log('Attempting to connect to MongoDB...');
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });

    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    // Make a simple query
    const db = client.db('geoguesser-miku');
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'MongoDB connection successful',
        collections: collections.map(c => c.name)
      })
    };
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Database connection error',
        message: error.message,
        stack: error.stack
      })
    };
  }
}; 