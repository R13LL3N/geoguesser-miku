# Miku GeoGuesser

A geography guessing game featuring Miku! Players need to guess which country each Miku represents.

## Project Setup

This project uses Netlify for hosting and serverless functions. It requires MongoDB for data storage and Netlify Blobs for image storage.

### Prerequisites

- Node.js and npm
- Netlify account
- MongoDB Atlas account (free tier works)

### Environment Variables

You need to set up the following environment variables in your Netlify dashboard:

1. `JWT_SECRET` - A secret key for JWT authentication
2. `MONGODB_URI` - Your MongoDB connection string

### Local Development

1. Clone the repository
   ```
   git clone <repository-url>
   cd geoguesser-miku
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=your_mongodb_connection_string
   ```

4. Start the local development server
   ```
   npm run dev
   ```

### Netlify Deployment

1. Push your code to a Git repository (GitHub, GitLab, etc.)

2. Connect your repository to Netlify

3. Set the build command to: `# no build command needed for static site`

4. Set the publish directory to: `.`

5. Set the required environment variables in the Netlify dashboard:
   - JWT_SECRET
   - MONGODB_URI

6. Deploy your site

## Storage Architecture

This application uses:

- **MongoDB** - For storing user data, image metadata, and scores
- **Netlify Blobs** - For storing the actual image files

## Contributing

Feel free to submit issues or pull requests to improve the project!

## License

This project is licensed under the MIT License. 