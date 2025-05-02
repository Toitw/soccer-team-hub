# TeamKick Production Deployment Guide

This guide provides instructions for deploying the TeamKick application to production in a commercial environment.

## Prerequisites

Before deploying to production, ensure you have the following:

1. **Database**: A PostgreSQL database service (such as Neon, Supabase, or your own PostgreSQL server)
2. **SendGrid Account**: For sending emails (verification, password reset, etc.)
3. **Environment Variables**: All required environment variables configured (see below)
4. **Node.js**: Version 20.x or later

## Environment Variables

Set the following environment variables in your production environment:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | Yes | `production` |
| `PORT` | Server port number | Yes | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgres://user:password@host:port/dbname` |
| `SESSION_SECRET` | Secret for session encryption (min 32 chars) | Yes | Long, random string |
| `SENDGRID_API_KEY` | SendGrid API key | Yes | Your API key |
| `EMAIL_FROM` | Sender email address | Recommended | `noreply@yourcompany.com` |
| `FRONTEND_URL` | URL of your frontend (for CORS) | Recommended | `https://teamkick.replit.app` |

## Deployment Steps

### 1. Validate Environment Variables

Run the validation script to ensure all required environment variables are set:

```bash
node scripts/validate-env.js
```

### 2. Build the Application

Build the application for production:

```bash
npm run build
```

This creates optimized production files in the `dist` directory.

### 3. Run Database Migrations

Apply database migrations to ensure schema is up to date:

```bash
npm run db:push
```

### 4. Start the Server

Start the server in production mode:

```bash
NODE_ENV=production node dist/index.js
```

### 5. Monitor the Application

Monitor the application using the health check endpoints:

- Basic health check: `GET /api/health`
- Detailed health check: `GET /api/health/detailed`

## Deploying to Replit

### Automatic Deployment

Replit provides built-in deployment capabilities. To deploy:

1. Navigate to your Repl's "Deployment" tab
2. Click "Deploy"
3. Replit will build and deploy your application

### Manual Deployment on Replit

If you prefer to manually deploy on Replit:

1. Ensure all environment variables are set in the Secrets tab
2. Run the deployment script:

```bash
node scripts/deploy.js
```

## Security Considerations

The application includes several security features:

- **Helmet**: HTTP security headers
- **CSRF Protection**: For all mutating requests
- **Rate Limiting**: Prevents abuse of API endpoints
- **Content Security Policy**: Restricts resource loading
- **Secure Cookies**: Configured for production environments
- **Database Query Validation**: Prevents SQL injection

## Production Monitoring

For production monitoring, consider implementing:

1. **Error Tracking**: Services like Sentry or New Relic
2. **Performance Monitoring**: Monitor API response times and database performance
3. **Uptime Monitoring**: Set up monitoring for the health check endpoints
4. **Log Management**: Centralize logs for easier debugging

## Backup Strategy

Implement a regular backup strategy for your PostgreSQL database:

1. Perform regular automated backups (daily recommended)
2. Test restoring from backups periodically
3. Store backups in a secure, off-site location

## Scaling Considerations

As your user base grows, consider these scaling strategies:

1. **Database**: Monitor database performance and scale vertically or horizontally as needed
2. **Application**: Deploy multiple instances behind a load balancer
3. **Caching**: Implement caching for frequently accessed data
4. **CDN**: Serve static assets through a CDN

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Check your `DATABASE_URL` environment variable
2. **Email Sending Failures**: Verify your SendGrid API key
3. **Memory Issues**: Monitor memory usage and adjust allocation if needed

### Getting Help

For additional assistance, contact the development team or refer to the application documentation.

---

This deployment guide covers the basic requirements for deploying TeamKick to production in a commercial environment. Customize it based on your specific infrastructure and requirements.