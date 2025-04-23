import fs from 'fs';
import * as argon2 from 'argon2';

/**
 * Hash a password using Argon2id (recommended for password hashing)
 * @param {string} password - The plain password to hash
 * @returns {Promise<string>} A secure Argon2id hash with embedded parameters
 */
async function hashPassword(password) {
  try {
    // Using Argon2id which offers a balanced approach of resistance against side-channel and GPU attacks
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,  // 64 MB
      parallelism: 4,
      timeCost: 3,
    });
    
    return hash; // Argon2 hashes are self-contained with algorithm parameters and salt
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Password hashing failed");
  }
}

async function createTestUsers() {
  try {
    const usersFile = 'data/users.json';
    const teamMembersFile = 'data/team_members.json';
    
    // Read current users
    let usersData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    
    // Remove any previous test users
    usersData = usersData.filter(user => 
      user.username !== 'coach1' && 
      user.username !== 'player1'
    );
    
    // Get the highest user ID
    const maxId = Math.max(...usersData.map(user => user.id || 0));
    
    // Create a new coach user
    const coachPassword = await hashPassword('coach123');
    const newCoachUser = {
      username: 'coach1',
      password: coachPassword,
      fullName: 'Team Coach',
      role: 'coach',
      email: 'coach@teamkick.com',
      id: maxId + 1,
      profilePicture: null,
      position: null,
      jerseyNumber: null,
      phoneNumber: null
    };
    
    console.log('Created coach user with password:', coachPassword);
    
    // Create a new player user
    const playerPassword = await hashPassword('player123');
    const newPlayerUser = {
      username: 'player1',
      password: playerPassword,
      fullName: 'Team Player',
      role: 'player',
      email: 'player@teamkick.com',
      id: maxId + 2,
      profilePicture: null,
      position: 'Forward',
      jerseyNumber: 9,
      phoneNumber: null
    };
    
    console.log('Created player user with password:', playerPassword);
    
    // Add the new users
    usersData.push(newCoachUser);
    usersData.push(newPlayerUser);
    
    // Save the updated users data
    fs.writeFileSync(usersFile, JSON.stringify(usersData, null, 2));
    
    // Read current team members
    let teamMembersData = JSON.parse(fs.readFileSync(teamMembersFile, 'utf8'));
    
    // Get the highest team member ID
    const maxTeamMemberId = Math.max(...teamMembersData.map(member => member.id || 0));
    
    // Remove any previous team members for these users
    teamMembersData = teamMembersData.filter(member => 
      member.userId !== newCoachUser.id && 
      member.userId !== newPlayerUser.id
    );
    
    // Create team member entries
    const newCoachTeamMember = {
      teamId: 1, // Assume team 1
      userId: newCoachUser.id,
      role: 'coach',
      id: maxTeamMemberId + 1,
    };
    
    const newPlayerTeamMember = {
      teamId: 1, // Assume team 1
      userId: newPlayerUser.id,
      role: 'player',
      id: maxTeamMemberId + 2,
    };
    
    // Add the new team members
    teamMembersData.push(newCoachTeamMember);
    teamMembersData.push(newPlayerTeamMember);
    
    // Save the updated team members data
    fs.writeFileSync(teamMembersFile, JSON.stringify(teamMembersData, null, 2));
    
    console.log('Test users created successfully!');
    console.log('Coach - Username: coach1, Password: coach123, ID:', newCoachUser.id);
    console.log('Player - Username: player1, Password: player123, ID:', newPlayerUser.id);
  } catch (error) {
    console.error('Error creating test users:', error);
  }
}

createTestUsers();