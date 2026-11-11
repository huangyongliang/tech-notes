import { installPrivacyListener } from "./utils/privacy";

App({
  globalData: {
    version: "2026.11",
    developmentVersion: "1.0.9",
    onlineVersion: "1.0.7",
  },
  onLaunch() {
    installPrivacyListener();
  },
});
