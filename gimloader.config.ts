import { workspaceConfig } from "@gimloader/build";

export default workspaceConfig({
  type: "workspace",
  splitPluginsAndLibraries: true,
  autoAlias: [
    "./plugins",
  ],
});
