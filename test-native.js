// Test native electron module
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);

// In Electron main process, require('electron') should work natively
// because Electron patches the module system
try {
  const electron = require('electron');
  console.log('electron module type:', typeof electron);
  console.log('electron.app:', electron.app);
  console.log('electron.BrowserWindow:', electron.BrowserWindow);
} catch (e) {
  console.log('Error loading electron:', e.message);
}
