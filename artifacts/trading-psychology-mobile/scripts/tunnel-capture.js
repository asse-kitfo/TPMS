const { spawn } = require("child_process");
const fs = require("fs");

const args = process.argv.slice(2);

const child = spawn("pnpm", ["exec", "expo", "start", ...args], {
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

let urlSaved = false;

function processLine(line) {
  process.stdout.write(line + "\n");
  if (!urlSaved) {
    const match = line.match(/Metro waiting on (exp:\/\/[^\s]+)/);
    if (match) {
      const url = match[1];
      urlSaved = true;
      try {
        fs.writeFileSync("/tmp/expo-tunnel-url.txt", url, "utf8");
        process.stdout.write("\n✓ QR page ready at /qr on the API server\n\n");
      } catch (e) {
        process.stderr.write("Could not save tunnel URL: " + e.message + "\n");
      }
    }
  }
}

let stdoutBuf = "";
child.stdout.on("data", (data) => {
  stdoutBuf += data.toString();
  const lines = stdoutBuf.split("\n");
  stdoutBuf = lines.pop();
  lines.forEach(processLine);
});

let stderrBuf = "";
child.stderr.on("data", (data) => {
  stderrBuf += data.toString();
  const lines = stderrBuf.split("\n");
  stderrBuf = lines.pop();
  lines.forEach((l) => process.stderr.write(l + "\n"));
});

child.on("exit", (code) => {
  if (stdoutBuf) process.stdout.write(stdoutBuf);
  if (stderrBuf) process.stderr.write(stderrBuf);
  process.exit(code ?? 0);
});
