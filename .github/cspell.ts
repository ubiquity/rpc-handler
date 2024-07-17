const { exec } = require("child_process");

exec('cspell "**/*"', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  if (stdout) console.log(`stdout: ${stdout}`);
  if (stderr) console.error(`stderr: ${stderr}`);
});
