/**
 * @name Default Creative Options
 * @description Lets you set default options for when you open a creative map.
 * @author grady.link
 * @version 1.0.0
 * @gamemode creative
 */

// src/index.ts
api.settings.create([
  {
    type: "group",
    title: "Editing Options",
    settings: [
      {
        type: "slider",
        id: "zoom",
        title: "Camera Zoom",
        min: 0.3,
        max: 1.5,
        step: 0.1,
        default: 1,
      },
      {
        type: "toggle",
        id: "collision",
        title: "Player Collision",
        default: true,
      },
      {
        type: "dropdown",
        id: "speed",
        title: "Player Speed",
        options: [
          { value: "0.25", label: "0.25x" },
          { value: "0.5", label: "0.5x" },
          { value: "1", label: "1x" },
          { value: "1.5", label: "1.5x" },
          { value: "2", label: "2x" },
          { value: "2.5", label: "2.5x" },
          { value: "3", label: "3x" },
          { value: "3.5", label: "3.5x" },
          { value: "4", label: "4x" },
        ],
        default: "1",
      },
      {
        type: "dropdown",
        id: "snap",
        title: "Grid Snap",
        options: [
          { value: "off", label: "Off" },
          { value: "64", label: "64" },
          { value: "32", label: "32" },
          { value: "16", label: "16" },
          { value: "8", label: "8" },
          { value: "4", label: "4" },
          { value: "2", label: "2" },
        ],
        default: "off",
      },
      {
        type: "toggle",
        id: "grid",
        title: "Show Grid",
        default: false,
      },
      {
        type: "dropdown",
        id: "zone",
        title: "Zone Device Display",
        options: [
          { value: "visible", label: "Visible" },
          { value: "border", label: "Borders Only" },
          { value: "hidden", label: "Hidden" },
        ],
        default: "border",
      },
      {
        type: "toggle",
        id: "memory",
        title: "Memory Bar",
        default: false,
      },
    ],
  },
  {
    type: "group",
    title: "Permissions",
    settings: [
      {
        type: "toggle",
        id: "adding",
        title: "Adding",
        default: false,
      },
      {
        type: "toggle",
        id: "removing",
        title: "Removing",
        default: false,
      },
      {
        type: "toggle",
        id: "editing",
        title: "Editing",
        default: false,
      },
      {
        type: "toggle",
        id: "blocks",
        title: "Blocks",
        default: false,
      },
    ],
  },
]);
var applySettings = () => {
  if (api.stores == void 0) return;
  if (api.stores.session.amIGameOwner) {
    api.stores.session.globalPermissions.adding = api.settings.adding;
    api.stores.session.globalPermissions.removing = api.settings.removing;
    api.stores.session.globalPermissions.editing = api.settings.editing;
    api.stores.session.globalPermissions.manageCodeGrids = api.settings.blocks;
    api.net.send(
      "SET_GLOBAL_PERMISSIONS",
      api.stores.session.globalPermissions,
    );
  }
  api.stores.me.editing.preferences.cameraZoom = api.settings.zoom;
  api.stores.phaser.mainCharacter.scene.cameraHelper.forceRefresh();
  api.stores.editing.gridSnap = api.settings.snap == "off"
    ? 0
    : parseInt(api.settings.snap);
  api.stores.me.editing.preferences.showGrid = api.settings.grid;
  api.stores.gui.showingGrid = api.settings.grid;
  api.stores.editing.showMemoryBarAtAllTimes = api.settings.memory;
};
api.settings.listen("zoom", applySettings);
api.settings.listen("collision", applySettings);
api.settings.listen("speed", applySettings);
api.settings.listen("snap", applySettings);
api.settings.listen("grid", applySettings);
api.settings.listen("zone", applySettings);
api.settings.listen("memory", applySettings);
api.settings.listen("adding", applySettings);
api.settings.listen("removing", applySettings);
api.settings.listen("editing", applySettings);
api.settings.listen("blocks", applySettings);
api.net.onLoad(applySettings);
