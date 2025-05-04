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

    // Try to connect to MongoDB with modified options for Netlify environment
    console.log('Attempting to connect to MongoDB...');
    
    // Parse the MongoDB connection string to modify it
    const connectionParts = process.env.MONGODB_URI.split('?');
    const baseUri = connectionParts[0];
    const queryParams = connectionParts.length > 1 ? connectionParts[1] : '';
    
    // Add explicit SSL options to the connection string
    const modifiedUri = `${baseUri}?ssl=true&sslValidate=false${queryParams ? '&' + queryParams : ''}`;
    
    console.log('Using modified connection string with SSL options');
    
    const client = new MongoClient(modifiedUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      ssl: true,
      sslValidate: false,
      directConnection: true
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
        stack: error.stack,
        mongodb_uri_present: !!process.env.MONGODB_URI
      })
    };
  }
}; 