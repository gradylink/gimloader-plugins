/**
 * @name CustomServer
 * @description Allows you to use custom servers with Gimkit.
 * @author grady.link
 * @version 0.1.0
 * @downloadUrl https://raw.githubusercontent.com/gradylink/gimloader-plugins/refs/heads/main/build/plugins/CustomServer.js
 */

// plugins/CustomServer/src/index.ts
api.settings.create([
  {
    type: "text",
    id: "url",
    title: "Matchmaker URL",
    description: "Base URL of your custom matchmaker, e.g. https://localhost:4461",
    default: "https://localhost:4461"
  }
]);
var normalizedMatchmakerUrl = () => {
  let url = (api.settings.url || "").trim();
  if (!url) {
    console.warn("[openkit] no matchmaker URL configured in plugin settings");
    return null;
  }
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  return url.replace(/\/+$/, "");
};
api.net.modifyFetchRequest(
  "/api/matchmaker/intent/live-game/create",
  (data) => {
    data.url = normalizedMatchmakerUrl() + data.url;
    return data;
  }
);
api.net.modifyFetchRequest("/api/matchmaker/find-info-from-code", (data) => {
  data.url = normalizedMatchmakerUrl() + data.url;
  return data;
});
api.net.modifyFetchRequest("/api/matchmaker/join", (data) => {
  data.url = normalizedMatchmakerUrl() + data.url;
  return data;
});
api.net.modifyFetchRequest("/api/matchmaker/intent/fetch-source/*", (data) => {
  data.url = normalizedMatchmakerUrl() + data.url;
  return data;
});
api.net.modifyFetchRequest(
  "/api/matchmaker/intent/live-game/summary/*",
  (data) => {
    data.url = normalizedMatchmakerUrl() + data.url;
    return data;
  }
);
api.net.modifyFetchRequest(
  "/api/matchmaker/find-server-to-host-game",
  (data) => {
    data.url = normalizedMatchmakerUrl() + data.url;
    return data;
  }
);
