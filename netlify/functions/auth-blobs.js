const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getStore } = require('@netlify/blobs');

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';

exports.handler = async function(event, context) {
  console.log('Auth Blobs Function Invoked');
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    console.log('Request path:', event.path);

    const { path } = event;
    let body = {};
    
    // Safely try to parse the body
    if (event.body) {
      try {
        body = JSON.parse(event.body);
        console.log('Request body received');
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    }

    // Get the blob store for users
    const store = getStore({ name: 'users' });

    // Handle login
    if (path.includes('/login')) {
      console.log('Handling login request');
      
      const { email, password } = body;
      
      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email and password are required' })
        };
      }
      
      // Try to get user from blob store
      let user;
      try {
        user = await store.get(email);
      } catch (error) {
        console.log('User not found:', email);
      }
      
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { email: user.email, username: user.username },
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
    if (path.includes('/signup')) {
      console.log('Handling signup request');
      
      const { email, password, username } = body;
      
      if (!email || !password || !username) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email, password, and username are required' })
        };
      }
      
      // Check if user exists
      let existingUser;
      try {
        existingUser = await store.get(email);
      } catch (error) {
        // User doesn't exist, which is what we want
        console.log('User not found (good for signup):', email);
      }
      
      if (existingUser) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User already exists' })
        };
      }
      
      // Create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        email,
        username,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };
      
      // Save user to blob store
      await store.set(email, user);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'User created successfully'
        })
      };
    }

    console.log('Route not found:', path);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found', path })
    };

  } catch (error) {
    console.error('Auth error:', error);
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