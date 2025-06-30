// Simple test to create a folder in Cloudinary
const cloudinary = require('cloudinary').v2;
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables from .env.development file
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true
});

async function testFolderCreation() {
  try {
    console.log('Testing folder creation in Cloudinary...');
    console.log(`Folder name: ${process.env.CLOUDINARY_FOLDER || 'celebs_media'}`);
    
    // Create a small test image if needed
    const testImagePath = path.join(__dirname, 'test-image.png');
    if (!fs.existsSync(testImagePath)) {
      // Create a simple 1x1 transparent PNG
      const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      fs.writeFileSync(testImagePath, buffer);
      console.log('Created test image');
    }

    // Upload test image to the specified folder
    const result = await cloudinary.uploader.upload(testImagePath, {
      folder: process.env.CLOUDINARY_FOLDER || 'celebs_media',
      public_id: 'test-folder-creation'
    });

    console.log('✅ Successfully uploaded to folder!');
    console.log('Public ID:', result.public_id);
    console.log('URL:', result.secure_url);
    
    // Clean up the test file
    fs.unlinkSync(testImagePath);
    
    // Now list the resources in the folder to confirm it exists
    const resources = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${process.env.CLOUDINARY_FOLDER || 'celebs_media'}/`
    });
    
    console.log(`\nResources in folder (${resources.resources.length} found):`);
    resources.resources.forEach(resource => {
      console.log(`- ${resource.public_id} (${resource.format})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('folder')) {
      console.log('\nPossible folder-related issues:');
      console.log('1. The folder name contains invalid characters (only alphanumeric, underscore and dash are allowed)');
      console.log('2. Path separators ("/" or "\\") are being used in the folder name');
      console.log('3. Permissions issue creating the folder in your Cloudinary account');
      console.log('\nTry fixing the CLOUDINARY_FOLDER value in your .env.development file');
    }
  }
}

testFolderCreation();
