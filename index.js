import { setConfig } from "@nexoracle/api";
import { initJavix } from "./lib/main.js";
import config from "#config";

setConfig({
  apiKey: config.nex_key,
});

initJavix().catch((err) => {
  console.error("Failed to start application:", err);
  process.exit(1);
});
