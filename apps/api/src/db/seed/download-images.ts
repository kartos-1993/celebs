import fs from 'fs';
import path from 'path';
import { image_search } from 'duckduckgo-images-api';
import https from 'https';
import http from 'http';

const DEST_DIR = path.join(process.cwd(), 'public/seed-images');

if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          downloadImage(res.headers.location, dest).then(resolve);
        } else {
          resolve(false);
        }
        return;
      }
      
      if (res.statusCode !== 200) {
        resolve(false);
        return;
      }
      
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      resolve(false);
    });
  });
}

async function run() {
  console.log("Starting to download curated men's fashion images...");
  try {
    const curatedUrls = [
      'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=800',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800',
      'https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=800',
      'https://images.unsplash.com/photo-1488161628813-04466f872be2?q=80&w=800',
      'https://images.unsplash.com/photo-1506634572416-48cdfe530110?q=80&w=800',
      'https://images.unsplash.com/photo-1516826957135-700ede19c6ce?q=80&w=800',
      'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=800',
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800',
      'https://images.unsplash.com/photo-1507680434267-37fe43372c3d?q=80&w=800',
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?q=80&w=800',
      'https://images.unsplash.com/photo-1550246140-5119ae4790b8?q=80&w=800',
      'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?q=80&w=800',
      'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=800',
      'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?q=80&w=800',
      'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=800',
      'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?q=80&w=800',
      'https://images.unsplash.com/photo-1489980557514-251d61e3eeb6?q=80&w=800',
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=800',
      'https://images.unsplash.com/photo-1610384104075-e05c8cf200c3?q=80&w=800',
      'https://images.unsplash.com/photo-1504280741561-12503923fcbd?q=80&w=800'
    ];
    
    let downloadedCount = 0;
    
    for (let i = 0; i < curatedUrls.length; i++) {
      const url = curatedUrls[i];
      const fileName = `mens-fashion-${i + 1}.jpg`;
      const destPath = path.join(DEST_DIR, fileName);
      
      const success = await downloadImage(url, destPath);
      if (success) {
        console.log(`Downloaded ${i + 1}/${curatedUrls.length}: ${fileName}`);
        downloadedCount++;
      } else {
        console.log(`Failed to download: ${url}`);
      }
    }
    console.log(`Finished downloading ${downloadedCount} high-quality images to ${DEST_DIR}`);
  } catch (error) {
    console.error('Failed to download images:', error);
  }
}

run();
