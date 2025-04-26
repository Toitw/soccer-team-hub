// build.js - Automatic build script for the application
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run build process
async function build() {
  console.log('🚀 Building application...');
  
  try {
    // Build the client and server 
    await runCommand('npm run build');
    
    // Ensure server/public directory exists
    const targetDir = path.join(__dirname, 'server', 'public');
    await fs.mkdir(targetDir, { recursive: true });
    
    // Copy files from dist/public to server/public
    const sourceDir = path.join(__dirname, 'dist', 'public');
    console.log(`📂 Copying files from ${sourceDir} to ${targetDir}`);
    
    // Copy all files from source to target
    await copyDirectory(sourceDir, targetDir);
    
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Helper function to run shell commands
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Running: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(stdout);
      resolve(stdout);
    });
  });
}

// Helper function to copy a directory recursively
async function copyDirectory(source, target) {
  const entries = await fs.readdir(source, { withFileTypes: true });
  
  await fs.mkdir(target, { recursive: true });
  
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(target, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Run the build process
build();