const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// In-memory user store (for demonstration only)
// In a real app, you would use a database
const users = {
  'demo@example.com': {
    email: 'demo@example.com',
    username: 'demouser',
    // bcrypt hash for "password123"
    password: '$2a$10$6UMoRIXRgdWPgYPmqcX7KuBf5RARsY9k4NzrEfZtYC5s8.rY3zBDy'
  }
};

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';

exports.handler = async function(event, context) {
  console.log('Auth Light Function Invoked');
  
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

    // Handle login
    if (path.includes('/login')) {
      console.log('Handling login request');
      
      const { email, password } = body;
      
      // Check if user exists
      const user = users[email];
      if (!user) {
        // For demo purposes, create a special "auto-register" pathway
        if (email === 'auto@example.com') {
          // Auto-create a user for testing
          const hashedPassword = await bcrypt.hash(password, 10);
          users[email] = {
            email,
            username: 'autouser',
            password: hashedPassword
          };
          
          const token = jwt.sign(
            { email, username: 'autouser' },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              token,
              username: 'autouser'
            })
          };
        }
        
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
      
      // Check if user exists
      if (users[email]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User already exists' })
        };
      }
      
      // Create user
      const hashedPassword = await bcrypt.hash(password, 10);
      users[email] = {
        email,
        username,
        password: hashedPassword
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'User created successfully',
          note: 'This is using an in-memory store. In production, you would save to a database.'
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