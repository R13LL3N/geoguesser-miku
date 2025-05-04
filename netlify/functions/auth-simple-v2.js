// In-memory storage for demonstration
const users = {};

// Simple token generation (not secure for production)
const generateToken = (email) => {
  return `token-${Date.now()}-${email.replace('@', '-at-')}`;
};

exports.handler = async function(event, context) {
  // Set headers for CORS and content type
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    // Log the request path and method
    console.log(`Request: ${event.httpMethod} ${event.path}`);
    
    // Parse the request body
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid JSON in request body'
          })
        };
      }
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    // Handle login
    if (event.path.includes('/login')) {
      const { email, password } = body;
      
      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email and password are required' })
        };
      }
      
      // Check if user exists
      if (!users[email]) {
        // For testing, auto-create a demo user if email is demo@example.com
        if (email === 'demo@example.com' && password === 'password123') {
          users[email] = {
            email,
            username: 'DemoUser',
            password: 'password123' // Not hashed for simplicity
          };
        } else {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Invalid credentials' })
          };
        }
      }
      
      // Check password (simple string comparison for demonstration)
      if (users[email].password !== password) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }
      
      // Generate a simple token
      const token = generateToken(email);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          token,
          username: users[email].username
        })
      };
    }

    // Handle signup
    if (event.path.includes('/signup')) {
      const { email, password, username } = body;
      
      if (!email || !password || !username) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email, password, and username are required' })
        };
      }
      
      // Check if user exists
      if (users[email]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User already exists' })
        };
      }
      
      // Create user (not hashed for simplicity)
      users[email] = {
        email,
        username,
        password
      };
      
      console.log(`User created: ${email}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'User created successfully',
          note: 'This is using in-memory storage for demonstration'
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Error:', error);
    
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