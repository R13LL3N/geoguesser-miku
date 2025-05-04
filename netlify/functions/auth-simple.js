exports.handler = async function(event, context) {
  console.log('Auth Simple Function Invoked');
  
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
    console.log('Request details:', {
      method: event.httpMethod,
      path: event.path,
      headers: event.headers,
      queryStringParameters: event.queryStringParameters
    });

    const { path } = event;
    let body = {};
    
    // Safely try to parse the body
    if (event.body) {
      try {
        body = JSON.parse(event.body);
        console.log('Parsed request body:', JSON.stringify(body));
      } catch (e) {
        console.error('Error parsing request body:', e);
        console.log('Raw body:', event.body);
      }
    } else {
      console.log('No request body provided');
    }

    // Just return success for testing purposes
    if (path.includes('/login')) {
      console.log('Handling login request');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          token: 'test-token',
          username: body.email || 'test-user'
        })
      };
    }

    // Just return success for testing purposes
    if (path.includes('/signup')) {
      console.log('Handling signup request');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'User created successfully (test mode)',
          data: body
        })
      };
    }

    console.log('Route not found:', path);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'Route not found', 
        path: path 
      })
    };

  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        stack: error.stack
      })
    };
  }
}; 