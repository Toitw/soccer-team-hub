import fs from 'fs';

const DATA_DIR = './data';
const TEAM_MEMBERS_FILE = `${DATA_DIR}/team_members.json`;
const USERS_FILE = `${DATA_DIR}/users.json`;

async function cleanDuplicates() {
  try {
    console.log('Starting duplicate cleanup...');
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      console.log('Data directory does not exist, no cleanup needed.');
      return;
    }
    
    // Check and clean team members
    if (fs.existsSync(TEAM_MEMBERS_FILE)) {
      console.log('Processing team members...');
      const teamMembersData = JSON.parse(fs.readFileSync(TEAM_MEMBERS_FILE, 'utf8'));
      
      if (teamMembersData && teamMembersData.length > 0) {
        console.log(`Found ${teamMembersData.length} team members`);
        
        // Check for duplicates based on teamId and userId
        const uniqueMembers = new Map();
        const duplicates = [];
        
        teamMembersData.forEach(member => {
          const key = `${member.teamId}-${member.userId}`;
          
          if (!uniqueMembers.has(key)) {
            uniqueMembers.set(key, member);
          } else {
            duplicates.push(member);
          }
        });
        
        if (duplicates.length > 0) {
          console.log(`Found ${duplicates.length} duplicate team members`);
          
          // Save only unique members
          const uniqueMembersArray = Array.from(uniqueMembers.values());
          fs.writeFileSync(TEAM_MEMBERS_FILE, JSON.stringify(uniqueMembersArray, null, 2));
          console.log(`Saved ${uniqueMembersArray.length} unique team members`);
        } else {
          console.log('No duplicate team members found');
        }
      }
    }
    
    // Check and clean users
    if (fs.existsSync(USERS_FILE)) {
      console.log('Processing users...');
      const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      
      if (usersData && usersData.length > 0) {
        console.log(`Found ${usersData.length} users`);
        
        // Check for duplicates based on username
        const uniqueUsers = new Map();
        const duplicates = [];
        
        usersData.forEach(user => {
          if (!uniqueUsers.has(user.username)) {
            uniqueUsers.set(user.username, user);
          } else {
            duplicates.push(user);
          }
        });
        
        if (duplicates.length > 0) {
          console.log(`Found ${duplicates.length} duplicate users`);
          
          // Save only unique users
          const uniqueUsersArray = Array.from(uniqueUsers.values());
          fs.writeFileSync(USERS_FILE, JSON.stringify(uniqueUsersArray, null, 2));
          console.log(`Saved ${uniqueUsersArray.length} unique users`);
        } else {
          console.log('No duplicate users found');
        }
      }
    }
    
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
  }
}

// Run the cleanup
cleanDuplicates().catch(console.error);