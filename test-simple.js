// Simple test without using require
console.log('Starting...');
const { app, BrowserWindow } = require('electron');
console.log('app object:', app);
console.log('BrowserWindow:', BrowserWindow);

if (!app) {
  console.log('app is undefined - electron not loaded correctly');
  process.exit(1);
}

app.whenReady().then(() => {
  console.log('App is ready!');
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL('data:text/html,<h1>Hello World</h1>');
});

app.on('window-all-closed', () => {
  app.quit();
});
