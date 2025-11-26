const electron = require('electron');
console.log('electron:', typeof electron);
console.log('app:', electron.app);
if (electron.app) {
  electron.app.whenReady().then(() => {
    console.log('ready!');
    electron.app.quit();
  });
} else {
  console.log('app is undefined');
}
