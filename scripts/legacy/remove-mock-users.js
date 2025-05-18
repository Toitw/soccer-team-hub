import fs from 'fs';

const DATA_DIR = './data';
const TEAM_MEMBERS_FILE = `${DATA_DIR}/team_members.json`;
const USERS_FILE = `${DATA_DIR}/users.json`;

// Function to check if a username looks like an auto-generated mock user
// This will match usernames like "sam.johnson123", "alex.wilson456", etc.
function isMockUsername(username) {
  // Preserve the admin user
  if (username === 'admin') {
    return false;
  }
  
  // Check for patterns of auto-generated mock users
  const mockPatterns = [
    /^[a-z]+\.[a-z]+\d*$/,       // firstname.lastname123
    /^coach\.team\d+$/           // coach.team123
  ];
  
  return mockPatterns.some(pattern => pattern.test(username));
}

async function removeMockUsers() {
  try {
    console.log('Starting removal of mock users...');
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      console.log('Data directory does not exist, nothing to remove.');
      return;
    }
    
    // Process users file
    let usersRemoved = 0;
    let usersData = [];
    let userIdsToRemove = [];
    
    if (fs.existsSync(USERS_FILE)) {
      usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      
      if (usersData && usersData.length > 0) {
        console.log(`Found ${usersData.length} users in database`);
        
        // Find users to remove using the pattern check
        const filteredUsers = usersData.filter(user => {
          if (isMockUsername(user.username)) {
            userIdsToRemove.push(user.id);
            usersRemoved++;
            return false;
          }
          return true;
        });
        
        // Save filtered users
        if (usersRemoved > 0) {
          fs.writeFileSync(USERS_FILE, JSON.stringify(filteredUsers, null, 2));
          console.log(`Removed ${usersRemoved} users from the database`);
          console.log(`User IDs to remove from team members: ${userIdsToRemove.join(', ')}`);
        } else {
          console.log('No matching mock users found to remove');
        }
      }
    }
    
    // Process team members file - remove memberships for deleted users
    let teamMembersRemoved = 0;
    
    if (fs.existsSync(TEAM_MEMBERS_FILE)) {
      const teamMembersData = JSON.parse(fs.readFileSync(TEAM_MEMBERS_FILE, 'utf8'));
      
      if (teamMembersData && teamMembersData.length > 0) {
        console.log(`Found ${teamMembersData.length} team members in database`);
        
        // Filter out team members associated with removed users
        const filteredTeamMembers = teamMembersData.filter(member => {
          if (userIdsToRemove.includes(member.userId)) {
            teamMembersRemoved++;
            return false;
          }
          return true;
        });
        
        // Save filtered team members
        if (teamMembersRemoved > 0) {
          fs.writeFileSync(TEAM_MEMBERS_FILE, JSON.stringify(filteredTeamMembers, null, 2));
          console.log(`Removed ${teamMembersRemoved} team members associated with deleted users`);
        } else {
          console.log('No team members found to remove');
        }
      }
    }
    
    console.log('Clean-up operation completed successfully');
  } catch (error) {
    console.error('Error removing mock users:', error);
  }
}

// Run the removal process
removeMockUsers().catch(console.error);