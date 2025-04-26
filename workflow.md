# How to Update Your Workflow

To make the build process fully automatic, follow these steps to update your "Start application" workflow:

1. Click on the "Workflows" button in the bottom-left corner of your Replit editor
2. Find the "Start application" workflow
3. Click the three dots (⋮) and select "Edit workflow"
4. Change the command from `npm run dev` to `./autodev.sh`
5. Click "Save"

This will ensure that every time you start your application, it will:
1. Build the client
2. Copy the files to the correct server/public directory
3. Start the server

## Manual Rebuild

If you need to manually rebuild the application at any time, you can run:

```bash
./autobuild.sh
```

This will build the client and copy the files to the server/public directory without restarting the server.