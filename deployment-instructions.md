# Deployment Instructions

## Prerequisites

Before deploying this application to production, ensure you have the following:

1. **PostgreSQL Database**: You need a PostgreSQL database URL (Neon, Supabase, or another provider)
2. **Node.js Runtime**: Node.js 18 or higher is required
3. **Environment Variables**: Prepare the required environment variables

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Required variables
DATABASE_URL=postgres://user:password@host:port/database
SESSION_SECRET=a_very_long_random_string_at_least_32_characters

# Optional variables
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

## Deployment Steps

### Option 1: Deploy on Replit

1. Click the "Deploy" button in Replit
2. Set the required environment variables in Replit's "Secrets" panel
3. Replit will handle the build and deployment process automatically

### Option 2: Manual Deployment

1. Prepare your environment:
   ```
   npm install
   ```

2. Build the application:
   ```
   npm run build
   ```

3. Migrate the database:
   ```
   npm run db:push
   ```

4. Start the production server:
   ```
   NODE_ENV=production npm start
   ```

### Option 3: Using our deployment script

We've included a deployment preparation script that automates most of these steps:

1. Run the preparation script:
   ```
   ./scripts/prepare-deploy.sh
   ```

2. Update the generated `.env` file with your production values

3. Start the production server:
   ```
   NODE_ENV=production npm start
   ```

## Production Configuration

The server is configured to handle both development and production environments:

- **Development**: Uses Vite middleware to serve frontend assets with hot module reloading
- **Production**: Serves pre-built static files from the `client/dist` directory

## Sessions

The application uses PostgreSQL for persistent session storage, which ensures sessions survive server restarts in production.

## Troubleshooting

### Database Connection Issues

- Verify your `DATABASE_URL` is correct and the database is accessible
- Check for firewall restrictions that might block PostgreSQL connections
- Ensure PostgreSQL user has the necessary permissions

### Session Management Issues

- Make sure the `session` table exists in your database
- Check the `SESSION_SECRET` is properly set
- Clear browser cookies if testing with an existing session

### Build Issues

- Run `npm run build` manually to see if there are any build errors
- Check for Node.js version compatibility (Node.js 18+ recommended)