# Automated Build System Documentation

This document describes the automated build process for the Soccer Team Management application.

## Overview

The application uses a build process that ensures that the client files are properly built and copied to the correct location for the server to serve them. This is necessary because the server expects the client files to be in `server/public`, but the build process outputs them to `dist/public`.

## Available Scripts

### `./autobuild.sh`

This script performs a complete build of the application and copies the client files to the correct location:

1. Runs `npm run build` to build the client and server
2. Creates the `server/public` directory if it doesn't exist
3. Copies all files from `dist/public` to `server/public`

Use this script when you want to manually build the application.

### `./autodev.sh`

This script is designed for development:

1. Runs `./autobuild.sh` to build the application
2. Starts the development server using `npm run dev`

Use this script when starting the application for development.

### `./watch-client.sh`

This script watches for changes in the client directory and automatically rebuilds the client when changes are detected:

1. Monitors the client directory for file changes
2. When changes are detected, runs `./autobuild.sh` to rebuild the client
3. Continues watching for changes

Run this script in a separate terminal while developing to automatically rebuild the client when you make changes.

## Continuous Integration

The application is configured with a GitHub Actions workflow in `.github/workflows/build.yml` that:

1. Builds the application when you push to the main branch
2. Ensures the client files are correctly copied to the server/public directory

## Recommended Workflow Usage

To make the build process fully automatic, follow these steps to update your "Start application" workflow:

1. Click on the "Workflows" button in the bottom-left corner of your Replit editor
2. Find the "Start application" workflow
3. Click the three dots (⋮) and select "Edit workflow"
4. Change the command from `npm run dev` to `./autodev.sh`
5. Click "Save"

After making this change, the application will automatically build and copy the client files to the correct location whenever you start the workflow.

## Troubleshooting

If you experience issues with the application not displaying correctly:

1. Check that the client files have been built by looking in the `dist/public` directory
2. Check that the client files have been copied to the `server/public` directory
3. If the files are missing, run `./autobuild.sh` to rebuild and copy them
4. If the error persists, check the server logs for any error messages