const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class GDriveTools {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.credentialsPath = path.join(__dirname, '..', 'credentials', 'gcp-oauth.keys.json');
    this.tokenPath = path.join(__dirname, '..', 'credentials', '.gdrive-server-credentials.json');
  }

  async initialize() {
    try {
      // Check if credentials file exists
      const credentialsExist = await this.fileExists(this.credentialsPath);
      if (!credentialsExist) {
        throw new Error(`OAuth credentials not found at ${this.credentialsPath}. Please follow the setup instructions in credentials/README.md`);
      }

      // Load OAuth credentials
      const credentials = JSON.parse(await fs.readFile(this.credentialsPath, 'utf8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      // Create OAuth2 client
      this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      // Check if we have saved tokens
      const tokenExists = await this.fileExists(this.tokenPath);
      if (tokenExists) {
        const token = JSON.parse(await fs.readFile(this.tokenPath, 'utf8'));
        this.auth.setCredentials(token);
        
        // Check if token is expired and refresh if needed
        if (token.expiry_date && token.expiry_date <= Date.now()) {
          await this.refreshToken();
        }
      } else {
        throw new Error('Authentication required. Please run authentication first.');
      }

      // Initialize Drive API
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error.message);
      throw error;
    }
  }

  async authenticate() {
    try {
      // Check if credentials file exists
      const credentialsExist = await this.fileExists(this.credentialsPath);
      if (!credentialsExist) {
        throw new Error(`OAuth credentials not found at ${this.credentialsPath}. Please follow the setup instructions in credentials/README.md`);
      }

      // Load OAuth credentials
      const credentials = JSON.parse(await fs.readFile(this.credentialsPath, 'utf8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      // Create OAuth2 client
      this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      // Generate auth URL
      const authUrl = this.auth.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      console.log('Please visit this URL to authorize the application:');
      console.log(authUrl);
      console.log('\nAfter authorization, you will receive an authorization code.');
      console.log('Please enter the code here and press Enter:');

      // In a real implementation, you would handle the callback
      // For now, we'll provide instructions
      return {
        authUrl,
        message: 'Please complete the OAuth flow and save the resulting tokens to .gdrive-server-credentials.json'
      };
    } catch (error) {
      console.error('Authentication failed:', error.message);
      throw error;
    }
  }

  async refreshToken() {
    try {
      const { credentials } = await this.auth.refreshAccessToken();
      this.auth.setCredentials(credentials);
      
      // Save refreshed token
      await fs.writeFile(this.tokenPath, JSON.stringify(credentials, null, 2));
      
      return credentials;
    } catch (error) {
      console.error('Token refresh failed:', error.message);
      throw error;
    }
  }

  async searchFiles(query, pageSize = 10, pageToken = null) {
    try {
      if (!this.drive) {
        await this.initialize();
      }

      const params = {
        q: query,
        pageSize: pageSize,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc'
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const response = await this.drive.files.list(params);
      
      return {
        files: response.data.files.map(file => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size ? parseInt(file.size) : null,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink
        })),
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      console.error('Search failed:', error.message);
      throw error;
    }
  }

  async readFile(fileId) {
    try {
      if (!this.drive) {
        await this.initialize();
      }

      // Get file metadata first
      const metadata = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size'
      });

      const file = metadata.data;
      let content = '';

      // Handle different file types
      if (file.mimeType.startsWith('application/vnd.google-apps.')) {
        // Google Workspace files - export to appropriate format
        let exportMimeType;
        switch (file.mimeType) {
          case 'application/vnd.google-apps.document':
            exportMimeType = 'text/markdown';
            break;
          case 'application/vnd.google-apps.spreadsheet':
            exportMimeType = 'text/csv';
            break;
          case 'application/vnd.google-apps.presentation':
            exportMimeType = 'text/plain';
            break;
          case 'application/vnd.google-apps.drawing':
            exportMimeType = 'image/png';
            break;
          default:
            exportMimeType = 'text/plain';
        }

        const response = await this.drive.files.export({
          fileId: fileId,
          mimeType: exportMimeType
        });

        if (exportMimeType === 'image/png') {
          // Return base64 encoded image
          content = Buffer.from(response.data).toString('base64');
        } else {
          content = response.data;
        }
      } else {
        // Regular files - download content
        const response = await this.drive.files.get({
          fileId: fileId,
          alt: 'media'
        });

        if (file.mimeType.startsWith('text/') || file.mimeType === 'application/json') {
          content = response.data;
        } else {
          // Binary files - return base64
          content = Buffer.from(response.data).toString('base64');
        }
      }

      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : null,
        content: content
      };
    } catch (error) {
      console.error('File read failed:', error.message);
      throw error;
    }
  }

  async checkAuthStatus() {
    try {
      const tokenExists = await this.fileExists(this.tokenPath);
      if (!tokenExists) {
        return { authenticated: false, message: 'No authentication tokens found' };
      }

      const token = JSON.parse(await fs.readFile(this.tokenPath, 'utf8'));
      
      // Check if token is expired
      if (token.expiry_date && token.expiry_date <= Date.now()) {
        return { authenticated: false, message: 'Authentication tokens expired' };
      }

      return { authenticated: true, message: 'Authentication valid' };
    } catch (error) {
      return { authenticated: false, message: `Authentication check failed: ${error.message}` };
    }
  }

  async completeAuthentication(authCode) {
    try {
      if (!this.auth) {
        // Load OAuth credentials
        const credentials = JSON.parse(await fs.readFile(this.credentialsPath, 'utf8'));
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
      }

      // Exchange authorization code for tokens
      const { tokens } = await this.auth.getToken(authCode);
      this.auth.setCredentials(tokens);

      // Save tokens
      await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
      
      console.log('Authentication completed successfully!');
      console.log('Tokens saved to:', this.tokenPath);
      
      return { success: true, tokens };
    } catch (error) {
      console.error('Authentication completion failed:', error.message);
      throw error;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { GDriveTools };