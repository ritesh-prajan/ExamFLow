import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  console.log("Starting ExamFlow dev server...");
  const server = spawn('npx', ['tsx', 'server.ts'], {
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });

  server.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  // Wait 5 seconds for server to start
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const outputDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const targets = [
    { name: 'landing_page', url: 'http://localhost:3000/welcome' },
    { name: 'dashboard', url: 'http://localhost:3000/dashboard?mock=true' },
    { name: 'knowledge_map', url: 'http://localhost:3000/graph?mock=true' },
    { name: 'study_plan', url: 'http://localhost:3000/plan?mock=true' },
    { name: 'settings', url: 'http://localhost:3000/settings?mock=true' }
  ];

  for (const target of targets) {
    console.log(`Navigating to ${target.url}...`);
    try {
      await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 30000 });
      // Extra delay for animations
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      const screenshotPath = path.join(outputDir, `${target.name}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot to ${screenshotPath}`);
    } catch (err) {
      console.error(`Failed to capture ${target.name}:`, err);
    }
  }

  console.log("Closing browser...");
  await browser.close();

  console.log("Stopping server...");
  server.kill('SIGTERM');
  
  // Extra pause to ensure clean exit
  await new Promise((resolve) => setTimeout(resolve, 2000));
  process.exit(0);
}

capture().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
