#!/usr/bin/env node

/**
 * 🎨 Athena MCP - Telegram Image Generator
 * 
 * This script generates images using OpenAI DALL-E 3 and saves them locally
 * for the Telegram bot to send to users.
 */

require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const https = require('https');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function generateAndSaveImage(prompt) {
  console.log(`🎨 Generating image: "${prompt}"`);
  
  try {
    // Generate image with OpenAI DALL-E 3
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd"
    });

    if (!response.data || !response.data[0] || !response.data[0].url) {
      throw new Error('No image URL received from OpenAI');
    }

    const imageUrl = response.data[0].url;
    console.log(`📡 Image URL received: ${imageUrl}`);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `generated-image-${timestamp}.png`;
    const filepath = path.join(process.cwd(), filename);

    // Download and save the image
    console.log(`💾 Downloading image to: ${filepath}`);
    await downloadImage(imageUrl, filepath);
    
    console.log(`✅ Image saved successfully: ${filename}`);
    
    return {
      success: true,
      filename: filename,
      filepath: filepath,
      url: imageUrl,
      prompt: prompt
    };

  } catch (error) {
    console.error(`❌ Error generating image: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      prompt: prompt
    };
  }
}

// Main execution
async function main() {
  const prompt = process.argv[2];
  
  if (!prompt) {
    console.error('❌ Please provide a prompt as an argument');
    console.log('Usage: node telegram-image-generator.js "your prompt here"');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('📝 Add your OpenAI API key to .env file:');
    console.log('   OPENAI_API_KEY=your_api_key_here');
    process.exit(1);
  }

  const result = await generateAndSaveImage(prompt);
  
  if (result.success) {
    console.log('\n🎉 SUCCESS!');
    console.log(`📁 File: ${result.filename}`);
    console.log(`📍 Location: ${result.filepath}`);
    console.log(`🎨 Prompt: "${result.prompt}"`);
  } else {
    console.log('\n💥 FAILED!');
    console.log(`❌ Error: ${result.error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateAndSaveImage };