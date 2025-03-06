import fs from 'fs';
import crypto from 'crypto';
import { promisify } from 'util';

const pbkdf2 = promisify(crypto.pbkdf2);

const DATA_DIR = './data';
const USERS_FILE = `${DATA_DIR}/users.json`;

// Admin user details
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123';

/**
 * Hash a password using PBKDF2
 * @param {string} password - The plain password to hash
 * @returns {Promise<string>} A string containing the salt and hash, separated by a colon
 */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 10000;
  const keylen = 64;
  const digest = 'sha512';
  
  const derivedKey = await pbkdf2(password, salt, iterations, keylen, digest);
  const hash = derivedKey.toString('hex');
  
  return `${salt}:${iterations}:${keylen}:${digest}:${hash}`;
}

/**
 * Initialize the admin user if it doesn't exist
 */
async function initializeAdmin() {
  try {
    console.log('Checking if admin user exists...');
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log('Created data directory');
    }
    
    let users = [];
    let adminExists = false;
    
    // Load existing users if the file exists
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      
      // Check if admin user already exists
      adminExists = users.some(user => user.username === ADMIN_USERNAME);
    }
    
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create admin user
    console.log('Admin user does not exist. Creating...');
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);
    
    const adminUser = {
      id: 1,
      username: ADMIN_USERNAME,
      password: hashedPassword,
      fullName: 'Admin User',
      role: 'admin',
      email: 'admin@example.com',
      profilePicture: 'https://ui-avatars.com/api/?name=Admin+User&background=0D47A1&color=fff'
    };
    
    // Add admin to users array
    users.push(adminUser);
    
    // Save users to file
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('Admin user created successfully');
    
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
}

// Run the initialization
initializeAdmin().catch(console.error);