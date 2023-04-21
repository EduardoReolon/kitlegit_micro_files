const fs = require('fs');

const env: {
  [key: string]: string
  PORT: string,
  NODE_ENV: string,
  storage_root: string,
  baseDir: string,
  appDir: string,
} = {
  PORT: '3000',
  NODE_ENV: 'development',
  storage_root: '',
  baseDir: '',
  appDir: '',
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true',
  PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium-browser',
}

function setEnvDir(dir: string) {
  env.baseDir = dir.replace(/(\/|\\)(build|src)$/, '');
  env.appDir = `${dir}/app`;
}

async function loadEnv() {
  try {
    fs.readFileSync(`${env.baseDir}/.env`, 'utf8').split(/\r\n|\n/).forEach((line: string) => {
      const content = line.replace(/#.*/g, '').trim();

      const pairs = content.split('=');
      if (!pairs[0] || !pairs[1]) return;

      env[pairs[0]] = pairs[1];
    });
  } catch (error) {}

  Object.keys(env).forEach((key) => {
    process.env[key] = env[key];
  });
}

export {env, loadEnv, setEnvDir};
