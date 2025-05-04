# Geoguesser Miku

A geography guessing game featuring Miku, built with HTML, CSS, and JavaScript.

## Deployment

This project is deployed on Netlify. No build step is required as it's a static site with Netlify Functions.

### Deployment Configuration

- **Build Command**: None required (static site)
- **Publish Directory**: Root directory (`.`)
- **Functions Directory**: `netlify/functions`

### Environment Variables

Make sure to set the following environment variables in your Netlify dashboard:

- `JWT_SECRET` - Secret key for JWT authentication
- Any other environment variables used in your functions 