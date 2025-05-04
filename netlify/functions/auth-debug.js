exports.handler = async function(event, context) {
  console.log('Auth Debug Function Invoked - Full Event:', JSON.stringify(event));
  
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
    // Log everything about the request
    console.log('Request method:', event.httpMethod);
    console.log('Request path:', event.path);
    console.log('Request headers:', JSON.stringify(event.headers));
    console.log('Request queryStringParameters:', JSON.stringify(event.queryStringParameters));
    console.log('Request multiValueQueryStringParameters:', JSON.stringify(event.multiValueQueryStringParameters));
    
    let body = {};
    
    // Safely try to parse the body
    if (event.body) {
      try {
        // Log the raw body first
        console.log('Raw request body:', event.body);
        body = JSON.parse(event.body);
        console.log('Parsed request body:', JSON.stringify(body));
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    } else {
      console.log('No request body provided');
    }

    // Handle login
    if (event.path.includes('/login')) {
      console.log('Handling login request');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Login debug - received request',
          receivedData: body
        })
      };
    }

    // Handle signup
    if (event.path.includes('/signup')) {
      console.log('Handling signup request');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'Signup debug - received request',
          receivedData: body
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
        availableRoutes: '/login, /signup' 
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