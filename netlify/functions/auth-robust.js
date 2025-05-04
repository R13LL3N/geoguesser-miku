const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getStore } = require('@netlify/blobs');

// Get JWT secret from environment variables or use a fallback
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';

// Helper to JSON stringify safely
const safeStringify = (obj) => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return '[Cannot stringify]';
  }
};

exports.handler = async function(event, context) {
  // Enable CORS - allow any origin for development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  // Log basic request info
  console.log(`Auth function invoked with method: ${event.httpMethod}, path: ${event.path}`);

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    console.log('Responding to OPTIONS request');
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    let body = {};
    
    // Safely parse the request body
    if (event.body) {
      try {
        body = JSON.parse(event.body);
        console.log('Parsed request body:', safeStringify({
          email: body.email ? '***@***' : undefined, // Hide actual email for privacy
          hasPassword: !!body.password,
          username: body.username
        }));
      } catch (error) {
        console.error('Error parsing request body:', error.message);
        console.log('Raw body:', event.body);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid JSON in request body',
            details: error.message
          })
        };
      }
    } else {
      console.log('No request body provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    // Initialize blob store
    console.log('Initializing blob store...');
    const store = getStore({ name: 'users' });
    console.log('Blob store initialized');

    // Handle login
    if (event.path.includes('/login')) {
      console.log('Processing login request');
      
      const { email, password } = body;
      
      if (!email || !password) {
        console.log('Login request missing required fields');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email and password are required' })
        };
      }
      
      console.log(`Attempting to retrieve user with email: ${email ? '***@***' : 'undefined'}`);
      
      // Try to get user from blob store
      let user;
      try {
        user = await store.get(email);
        console.log('User retrieval result:', user ? 'User found' : 'User not found');
      } catch (error) {
        console.error('Error retrieving user:', error.message);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error retrieving user data',
            details: error.message
          })
        };
      }
      
      if (!user) {
        console.log('Login failed: User not found');
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }
      
      // Verify password
      console.log('Verifying password...');
      let isPasswordValid;
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Password verification result:', isPasswordValid ? 'Valid' : 'Invalid');
      } catch (error) {
        console.error('Error verifying password:', error.message);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error verifying password',
            details: error.message
          })
        };
      }
      
      if (!isPasswordValid) {
        console.log('Login failed: Invalid password');
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }
      
      // Generate JWT token
      console.log('Generating JWT token...');
      let token;
      try {
        token = jwt.sign(
          { email: user.email, username: user.username },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        console.log('JWT token generated successfully');
      } catch (error) {
        console.error('Error generating JWT:', error.message);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error generating authentication token',
            details: error.message
          })
        };
      }
      
      console.log('Login successful');
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
    if (event.path.includes('/signup')) {
      console.log('Processing signup request');
      
      const { email, password, username } = body;
      
      if (!email || !password || !username) {
        console.log('Signup request missing required fields');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email, password, and username are required' })
        };
      }
      
      console.log('Checking if user already exists');
      
      // Check if user exists
      let existingUser;
      try {
        existingUser = await store.get(email);
        console.log('User existence check result:', existingUser ? 'User exists' : 'User does not exist');
      } catch (error) {
        console.log('Error checking user existence (likely means user does not exist):', error.message);
        // Continue with signup as this error likely means the user doesn't exist
      }
      
      if (existingUser) {
        console.log('Signup failed: User already exists');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User already exists' })
        };
      }
      
      // Create user
      console.log('Hashing password...');
      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');
      } catch (error) {
        console.error('Error hashing password:', error.message);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error creating user',
            details: error.message
          })
        };
      }
      
      const user = {
        email,
        username,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };
      
      // Save user to blob store
      console.log('Saving user to blob store...');
      try {
        await store.set(email, user);
        console.log('User saved successfully');
      } catch (error) {
        console.error('Error saving user to blob store:', error.message);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error saving user data',
            details: error.message
          })
        };
      }
      
      console.log('Signup successful');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'User created successfully'
        })
      };
    }

    console.log('Route not found:', event.path);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'Route not found', 
        path: event.path,
        supportedPaths: ['/login', '/signup']
      })
    };

  } catch (error) {
    console.error('Unexpected error in auth function:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        stack: error.stack
      })
    };
  }
}; 