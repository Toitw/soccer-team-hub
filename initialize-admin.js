import fs from 'fs';
import crypto from 'crypto';
import util from 'util';

const DATA_DIR = './data';
const USERS_FILE = `${DATA_DIR}/users.json`;

// Helper functions for password hashing
const scryptAsync = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function initializeAdmin() {
  try {
    // Create data directory if it doesn't exist
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Check if users file exists
    let users = [];
    
    if (fs.existsSync(USERS_FILE)) {
      const fileData = fs.readFileSync(USERS_FILE, 'utf8');
      if (fileData) {
        users = JSON.parse(fileData);
        console.log(`Found ${users.length} existing users`);
      }
    }
    
    // Check if admin user exists
    const adminExists = users.some(user => user.username === 'admin');
    
    if (!adminExists) {
      console.log('Admin user not found. Creating default admin user...');
      
      // Create hashed password
      const hashedPassword = await hashPassword('password123');
      
      // Create admin user
      const adminUser = {
        id: 1,
        username: 'admin',
        password: hashedPassword,
        fullName: 'Admin User',
        role: 'admin',
        email: 'admin@example.com',
        profilePicture: 'https://ui-avatars.com/api/?name=Admin+User&background=0D47A1&color=fff',
        position: null,
        jerseyNumber: null,
        phoneNumber: null
      };
      
      // Add admin to users array
      users.push(adminUser);
      
      // Save updated users to file
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      console.log('Admin user created successfully.');
    } else {
      console.log('Admin user already exists.');
    }
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
}

// Run the initialization
initializeAdmin().catch(console.error);