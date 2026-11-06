import { installPrivacyListener } from "./utils/privacy";

App({
  globalData: {
    version: "2026.11",
  },
  onLaunch() {
    installPrivacyListener();
  },
});
