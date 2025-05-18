import fs from 'fs';

const DATA_DIR = './data';
const TEAM_MEMBERS_FILE = `${DATA_DIR}/team_members.json`;

/**
 * This script removes duplicate team members
 * It looks for multiple entries with the same teamId and userId and keeps only the first one
 */
async function removeDuplicateMembers() {
  try {
    console.log('Starting removal of duplicate team members...');
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR) || !fs.existsSync(TEAM_MEMBERS_FILE)) {
      console.log('Team members file does not exist, nothing to clean up.');
      return;
    }
    
    // Read the team members data
    const teamMembersData = JSON.parse(fs.readFileSync(TEAM_MEMBERS_FILE, 'utf8'));
    if (!teamMembersData || teamMembersData.length === 0) {
      console.log('No team members found, nothing to clean up.');
      return;
    }
    
    console.log(`Found ${teamMembersData.length} team members entries total`);
    
    // Track unique team-user combinations
    const teamUserCombos = new Map();
    const cleanedMembers = [];
    let duplicatesRemoved = 0;
    
    // Filter out duplicates
    for (const member of teamMembersData) {
      const comboKey = `${member.teamId}-${member.userId}`;
      
      if (!teamUserCombos.has(comboKey)) {
        // First occurrence, keep it
        teamUserCombos.set(comboKey, true);
        cleanedMembers.push(member);
      } else {
        // Duplicate, skip it
        duplicatesRemoved++;
        console.log(`Removing duplicate: Team ${member.teamId}, User ${member.userId}, Member ID ${member.id}`);
      }
    }
    
    // Save the cleaned data
    if (duplicatesRemoved > 0) {
      fs.writeFileSync(TEAM_MEMBERS_FILE, JSON.stringify(cleanedMembers, null, 2));
      console.log(`Removed ${duplicatesRemoved} duplicate team members`);
    } else {
      console.log('No duplicate team members found');
    }
    
    console.log('Clean-up operation completed successfully');
  } catch (error) {
    console.error('Error removing duplicate team members:', error);
  }
}

// Run the clean-up process
removeDuplicateMembers().catch(console.error);
