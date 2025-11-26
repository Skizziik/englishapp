// Wait for next tick to ensure electron is fully initialized
setImmediate(() => {
  console.log('process.type:', process.type);
  console.log('process.versions.electron:', process.versions.electron);

  const electron = require('electron');
  console.log('electron type:', typeof electron);

  if (typeof electron === 'string') {
    console.log('electron is a path string:', electron);
    console.log('This means the npm electron module is loaded instead of native electron');
  } else {
    console.log('electron.app:', electron.app);
  }

  process.exit(0);
});
