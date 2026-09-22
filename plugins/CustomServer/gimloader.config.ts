import { singleConfig } from "@gimloader/build";

export default singleConfig({
  input: "./src/index.ts",
  name: "CustomServer",
  description: "Allows you to use custom servers with Gimkit.",
  author: "grady.link",
  version: "0.1.0",
  downloadUrl:
    "https://raw.githubusercontent.com/gradylink/gimloader-plugins/refs/heads/main/build/plugins/CustomServer.js",
});
