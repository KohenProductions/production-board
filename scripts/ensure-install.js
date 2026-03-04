#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const nodeModules = path.join(projectRoot, "node_modules");

if (!fs.existsSync(nodeModules)) {
  console.log("node_modules not found, running npm install...");
  execSync("npm install", { cwd: projectRoot, stdio: "inherit" });
}
