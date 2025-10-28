import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function projectBuilder(deploymentId: string) {
  return new Promise((resolve) => {
    const projectPath = path.join(__dirname,"..","..", "downloads", deploymentId);
    const command = `cd ${projectPath} && npm install && npm run build`;

    const child = exec(command);

    child.stdout?.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    child.stderr?.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    child.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      resolve(true);
    });
  });
}
