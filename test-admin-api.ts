import axios from 'axios';
import fs from 'fs';

// Function to test the admin API endpoint
async function testAdminApi() {
  try {
    // First login to get a session cookie
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/login', {
      username: 'admin',
      password: 'admin123'
    }, {
      withCredentials: true
    });
    
    console.log('Login successful:', loginResponse.data);
    
    // Get the cookie from the login response
    const cookies = loginResponse.headers['set-cookie'];
    
    if (!cookies) {
      console.error('No cookies returned from login');
      return;
    }
    
    // Now make a request to the admin users endpoint
    console.log('\nFetching admin users...');
    const usersResponse = await axios.get('http://localhost:5000/api/admin/users', {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    // Write the response to a file for inspection
    console.log('Admin users API response:');
    console.log(JSON.stringify(usersResponse.data, null, 2));
    
    // Save to file
    fs.writeFileSync('admin-users-response.json', JSON.stringify(usersResponse.data, null, 2));
    console.log('\nResponse saved to admin-users-response.json');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run the test
testAdminApi();