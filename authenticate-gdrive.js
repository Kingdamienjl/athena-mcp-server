#!/usr/bin/env node

const { GDriveTools } = require('./tools/gdrive_tools');
const readline = require('readline');

async function authenticateGoogleDrive() {
  const gdrive = new GDriveTools();
  
  try {
    console.log('🔐 Starting Google Drive authentication...\n');
    
    // Check current auth status
    const status = await gdrive.checkAuthStatus();
    if (status.authenticated) {
      console.log('✅ Already authenticated!');
      console.log('Authentication status:', status.message);
      return;
    }
    
    console.log('❌ Not authenticated:', status.message);
    console.log('Starting OAuth flow...\n');
    
    // Start authentication
    const authResult = await gdrive.authenticate();
    console.log('\n📋 Please follow these steps:');
    console.log('1. Click the URL above to open it in your browser');
    console.log('2. Sign in to your Google account');
    console.log('3. Grant permission to access Google Drive');
    console.log('4. Copy the authorization code from the browser');
    console.log('5. Paste it below and press Enter\n');
    
    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Prompt for authorization code
    const authCode = await new Promise((resolve) => {
      rl.question('Enter the authorization code: ', (code) => {
        rl.close();
        resolve(code.trim());
      });
    });
    
    if (!authCode) {
      console.log('❌ No authorization code provided. Exiting...');
      process.exit(1);
    }
    
    console.log('\n🔄 Completing authentication...');
    
    // Complete authentication
    const result = await gdrive.completeAuthentication(authCode);
    
    if (result.success) {
      console.log('✅ Authentication completed successfully!');
      console.log('🎉 Google Drive is now ready to use with the MCP server');
      
      // Verify authentication
      const finalStatus = await gdrive.checkAuthStatus();
      console.log('Final status:', finalStatus.message);
    }
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.error('\n💡 Troubleshooting tips:');
    console.error('1. Make sure gcp-oauth.keys.json exists in the credentials folder');
    console.error('2. Verify the OAuth client is configured for "Desktop application"');
    console.error('3. Check that the redirect URI is set to http://localhost');
    console.error('4. Ensure the Google Drive API is enabled in your Google Cloud project');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  authenticateGoogleDrive();
}

module.exports = { authenticateGoogleDrive };