import {
  agreePrivacy,
  attachPrivacyHost,
  detachPrivacyHost,
  disagreePrivacy,
} from "../../utils/privacy";

const hosts = new Map<object, { open(contractName: string): void; close(): void }>();

Component({
  data: {
    show: false,
    contractName: "《小程序用户隐私保护指引》",
  },
  lifetimes: {
    attached() {
      const self = this as object;
      const host = {
        open: (contractName: string) => {
          this.setData({
            show: true,
            contractName: contractName || "《小程序用户隐私保护指引》",
          });
        },
        close: () => {
          if (!this.data.show) return;
          this.setData({ show: false });
        },
      };
      hosts.set(self, host);
      attachPrivacyHost(host);
    },
    detached() {
      const self = this as object;
      const host = hosts.get(self);
      if (!host) return;
      hosts.delete(self);
      detachPrivacyHost(host);
    },
  },
  methods: {
    noop() {},
    onDisagree() {
      disagreePrivacy();
    },
    onAgree(event: { currentTarget?: { id?: string } }) {
      agreePrivacy(event.currentTarget?.id || "agree-btn");
    },
  },
});
