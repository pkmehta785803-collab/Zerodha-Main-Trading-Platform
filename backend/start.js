const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const port = Number(process.env.PORT) || 3001;

const isApiHealthy = () =>
  new Promise((resolve) => {
    const request = http.get(
      { hostname: "127.0.0.1", port, path: "/health", timeout: 1500 },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve(response.statusCode === 200 && JSON.parse(body).status === "ok");
          } catch {
            resolve(false);
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });

const start = async () => {
  if (await isApiHealthy()) {
    console.info(`API is already healthy on port ${port}; no second instance was started.`);
    return;
  }

  const nodemonPath = path.join(__dirname, "node_modules", "nodemon", "bin", "nodemon.js");
  const backend = spawn(process.execPath, [nodemonPath, "index.js"], {
    cwd: __dirname,
    env: process.env,
    stdio: "inherit",
  });

  backend.on("error", (error) => {
    console.error("Could not start the backend:", error.message);
    process.exitCode = 1;
  });
  backend.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
};

start().catch((error) => {
  console.error("Could not check backend health:", error.message);
  process.exitCode = 1;
});
