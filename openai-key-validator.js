#!/usr/bin/env node

/**
 * OpenAI API Key Validator and Tester
 * Validates the OpenAI API key and tests basic functionality
 */

require('dotenv').config();
const https = require('https');

class OpenAIKeyValidator {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.baseUrl = 'https://api.openai.com/v1';
    }

    /**
     * Validate the API key format
     */
    validateKeyFormat() {
        console.log('🔍 Validating API key format...');
        
        if (!this.apiKey) {
            console.error('❌ No OpenAI API key found in environment variables');
            return false;
        }

        // Check if it's a valid OpenAI API key format
        const keyPatterns = [
            /^sk-[A-Za-z0-9]{48}$/, // Standard user key
            /^sk-proj-[A-Za-z0-9_-]{64,}$/, // Project key (64+ characters)
            /^sk-[A-Za-z0-9_-]{20}T3BlbkFJ[A-Za-z0-9_-]{20,}$/ // Legacy format with T3BlbkFJ
        ];

        const isValidFormat = keyPatterns.some(pattern => pattern.test(this.apiKey));
        
        if (!isValidFormat) {
            console.error('❌ Invalid API key format detected');
            console.log('Expected formats:');
            console.log('  - Standard: sk-[48 characters]');
            console.log('  - Project: sk-proj-[64 characters]');
            console.log('  - Legacy: sk-[20 chars]T3BlbkFJ[20 chars]');
            return false;
        }

        console.log('✅ API key format is valid');
        return true;
    }

    /**
     * Test API key by making a simple request
     */
    async testApiKey() {
        console.log('🧪 Testing API key with OpenAI API...');
        
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
            });

            const options = {
                hostname: 'api.openai.com',
                port: 443,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (res.statusCode === 200) {
                            console.log('✅ API key is valid and working');
                            console.log(`📊 Model: ${response.model}`);
                            console.log(`💬 Response: ${response.choices[0].message.content}`);
                            resolve({ valid: true, response });
                        } else {
                            console.error(`❌ API request failed with status ${res.statusCode}`);
                            console.error(`Error: ${response.error?.message || 'Unknown error'}`);
                            
                            // Provide specific error guidance
                            this.provideErrorGuidance(res.statusCode, response.error);
                            resolve({ valid: false, error: response.error });
                        }
                    } catch (parseError) {
                        console.error('❌ Failed to parse API response:', parseError.message);
                        reject(parseError);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ Network error:', error.message);
                reject(error);
            });

            req.write(data);
            req.end();
        });
    }

    /**
     * Check account status and usage
     */
    async checkAccountStatus() {
        console.log('📊 Checking account status...');
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.openai.com',
                port: 443,
                path: '/v1/models',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (res.statusCode === 200) {
                            console.log('✅ Account is active');
                            console.log(`📋 Available models: ${response.data.length}`);
                            
                            // List key models
                            const keyModels = response.data
                                .filter(model => model.id.includes('gpt'))
                                .slice(0, 5)
                                .map(model => model.id);
                            
                            console.log('🤖 Key models available:', keyModels.join(', '));
                            resolve({ valid: true, models: response.data });
                        } else {
                            console.error(`❌ Account check failed with status ${res.statusCode}`);
                            resolve({ valid: false, error: response.error });
                        }
                    } catch (parseError) {
                        console.error('❌ Failed to parse models response:', parseError.message);
                        reject(parseError);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ Network error during account check:', error.message);
                reject(error);
            });

            req.end();
        });
    }

    /**
     * Provide specific error guidance based on status code
     */
    provideErrorGuidance(statusCode, error) {
        console.log('\n🔧 Troubleshooting guidance:');
        
        switch (statusCode) {
            case 401:
                console.log('• Check if your API key is correct');
                console.log('• Ensure the key hasn\'t been revoked or expired');
                console.log('• Verify you\'re using the right organization (if applicable)');
                break;
                
            case 403:
                console.log('• Your account may not have access to this model');
                console.log('• Check if you have sufficient credits/quota');
                console.log('• Verify your account is in good standing');
                break;
                
            case 429:
                console.log('• You\'ve hit rate limits - wait and try again');
                console.log('• Consider upgrading your plan for higher limits');
                break;
                
            case 500:
            case 502:
            case 503:
                console.log('• OpenAI API is experiencing issues');
                console.log('• Try again in a few minutes');
                break;
                
            default:
                console.log(`• Unexpected error (${statusCode}): ${error?.message || 'Unknown'}`);
        }
        
        console.log('\n📚 Additional resources:');
        console.log('• OpenAI API Documentation: https://platform.openai.com/docs');
        console.log('• API Key Management: https://platform.openai.com/api-keys');
        console.log('• Usage Dashboard: https://platform.openai.com/usage');
    }

    /**
     * Generate a new API key suggestion
     */
    suggestKeyGeneration() {
        console.log('\n🔑 To generate a new API key:');
        console.log('1. Visit https://platform.openai.com/api-keys');
        console.log('2. Click "Create new secret key"');
        console.log('3. Choose between:');
        console.log('   • User key (sk-...) - for personal use');
        console.log('   • Project key (sk-proj-...) - for specific projects');
        console.log('4. Copy the key and update your .env file');
        console.log('5. Never share your API key publicly');
    }

    /**
     * Run complete validation
     */
    async runCompleteValidation() {
        console.log('🚀 Starting OpenAI API Key Validation\n');
        
        try {
            // Step 1: Format validation
            const formatValid = this.validateKeyFormat();
            if (!formatValid) {
                this.suggestKeyGeneration();
                return { success: false, step: 'format' };
            }

            // Step 2: API test
            const apiTest = await this.testApiKey();
            if (!apiTest.valid) {
                this.suggestKeyGeneration();
                return { success: false, step: 'api_test', error: apiTest.error };
            }

            // Step 3: Account status
            const accountStatus = await this.checkAccountStatus();
            if (!accountStatus.valid) {
                return { success: false, step: 'account_status', error: accountStatus.error };
            }

            console.log('\n🎉 All validations passed! Your OpenAI API key is working correctly.');
            return { success: true };

        } catch (error) {
            console.error('\n❌ Validation failed with error:', error.message);
            return { success: false, step: 'exception', error: error.message };
        }
    }

    /**
     * Fix common .env issues
     */
    async fixEnvIssues() {
        console.log('🔧 Checking .env file configuration...');
        
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env');
        
        try {
            if (!fs.existsSync(envPath)) {
                console.log('❌ .env file not found');
                console.log('Creating sample .env file...');
                
                const sampleEnv = `# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ORG_ID=your_org_id_here

# Other API Keys
ANTHROPIC_API_KEY=your_anthropic_key_here
`;
                
                fs.writeFileSync(envPath, sampleEnv);
                console.log('✅ Sample .env file created');
                return;
            }
            
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');
            
            let hasOpenAIKey = false;
            let keyLine = '';
            
            lines.forEach((line, index) => {
                if (line.startsWith('OPENAI_API_KEY=')) {
                    hasOpenAIKey = true;
                    keyLine = line;
                    
                    const keyValue = line.split('=')[1];
                    if (!keyValue || keyValue === 'your_openai_api_key_here') {
                        console.log(`❌ Line ${index + 1}: API key is not set`);
                    } else if (keyValue.includes(' ')) {
                        console.log(`❌ Line ${index + 1}: API key contains spaces`);
                    } else if (!keyValue.startsWith('sk-')) {
                        console.log(`❌ Line ${index + 1}: API key doesn't start with 'sk-'`);
                    } else {
                        console.log(`✅ Line ${index + 1}: API key format looks correct`);
                    }
                }
            });
            
            if (!hasOpenAIKey) {
                console.log('❌ OPENAI_API_KEY not found in .env file');
                console.log('Add this line to your .env file:');
                console.log('OPENAI_API_KEY=your_actual_api_key_here');
            }
            
        } catch (error) {
            console.error('❌ Error checking .env file:', error.message);
        }
    }
}

// Export for use in other modules
module.exports = OpenAIKeyValidator;

// CLI interface
if (require.main === module) {
    const validator = new OpenAIKeyValidator();
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'format':
            validator.validateKeyFormat();
            break;
            
        case 'test':
            validator.testApiKey().catch(console.error);
            break;
            
        case 'account':
            validator.checkAccountStatus().catch(console.error);
            break;
            
        case 'env':
            validator.fixEnvIssues();
            break;
            
        case 'full':
        default:
            validator.runCompleteValidation().then(result => {
                process.exit(result.success ? 0 : 1);
            }).catch(error => {
                console.error('Validation failed:', error);
                process.exit(1);
            });
    }
}