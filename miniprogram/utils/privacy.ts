/**
 * Clipboard copy needs a privacy agreement before wx.setClipboardData.
 * The popup button uses open-type="agreePrivacyAuthorization".
 * If the platform already paused the call, resolve({ event: "agree" }) resumes it.
 */

const AGREE_BUTTON_ID = "agree-btn";
const DEFAULT_CONTRACT_NAME = "《小程序用户隐私保护指引》";

type PrivacyResolve = (result: {
  event: "exposureAuthorization" | "agree" | "disagree";
  buttonId?: string;
}) => void;

interface PendingResolve {
  resolve: PrivacyResolve;
  exposed: boolean;
}

interface PrivacyHost {
  open(contractName: string): void;
  close(): void;
}

const hosts: PrivacyHost[] = [];
const resolves: PendingResolve[] = [];

type ClipboardWrite = (option: WechatMiniprogram.SetClipboardDataOption) => void;

let installed = false;
let waiting = false;
let contractName = DEFAULT_CONTRACT_NAME;
let pendingText: string | null = null;
let pendingWrite: ClipboardWrite = writeClipboardDirect;
let ignorePrivacyFails = 0;

function writeClipboardDirect(option: WechatMiniprogram.SetClipboardDataOption): void {
  wx.setClipboardData(option);
}

function topHost(): PrivacyHost | undefined {
  return hosts[hosts.length - 1];
}

function expose(): void {
  resolves.forEach((item) => {
    if (item.exposed) return;
    item.exposed = true;
    item.resolve({ event: "exposureAuthorization" });
  });
}

function paint(): void {
  const top = topHost();
  hosts.forEach((host) => {
    if (waiting && host === top) {
      host.open(contractName);
      expose();
    } else {
      host.close();
    }
  });
}

function loadContractName(): void {
  if (typeof wx.getPrivacySetting !== "function") return;
  wx.getPrivacySetting({
    success(res) {
      if (!res.privacyContractName || res.privacyContractName === contractName) return;
      contractName = res.privacyContractName;
      if (waiting) paint();
    },
  });
}

function readErrno(err: { errMsg?: string }): number | undefined {
  const errno = (err as { errno?: number }).errno;
  return typeof errno === "number" ? errno : undefined;
}

function isPrivacyNotAgreed(err: { errMsg?: string }): boolean {
  const errno = readErrno(err);
  if (errno === 103 || errno === 104) return true;
  const msg = err.errMsg || "";
  return msg.indexOf("privacy permission is not authorized") !== -1;
}

function rememberCopy(text: string, write: ClipboardWrite): void {
  pendingText = text;
  pendingWrite = write;
  waiting = true;
  loadContractName();
  paint();
}

function handleFail(
  err: WechatMiniprogram.GeneralCallbackResult,
  text: string,
  write: ClipboardWrite
): void {
  if (!isPrivacyNotAgreed(err)) {
    wx.showToast({ title: "复制失败", icon: "none" });
    return;
  }
  if (ignorePrivacyFails > 0) {
    ignorePrivacyFails -= 1;
    return;
  }
  if (resolves.length > 0 || waiting) return;
  rememberCopy(text, write);
}

function writeClipboard(text: string, write: ClipboardWrite): void {
  write({
    data: text,
    fail(err) {
      handleFail(err, text, write);
    },
  });
}

export function installPrivacyListener(): void {
  if (installed) return;
  if (typeof wx.onNeedPrivacyAuthorization !== "function") return;
  installed = true;
  const listen = wx.onNeedPrivacyAuthorization as unknown as (
    listener: (resolve: PrivacyResolve) => void
  ) => void;
  listen((resolve) => {
    resolves.push({ resolve, exposed: false });
    waiting = true;
    loadContractName();
    paint();
  });
}

export function attachPrivacyHost(host: PrivacyHost): void {
  if (hosts.indexOf(host) === -1) hosts.push(host);
  paint();
}

export function detachPrivacyHost(host: PrivacyHost): void {
  const index = hosts.lastIndexOf(host);
  if (index >= 0) hosts.splice(index, 1);
  paint();
}

export function copyText(data: string, write: ClipboardWrite = writeClipboardDirect): void {
  installPrivacyListener();
  const text = String(data ?? "");
  if (waiting) {
    if (resolves.length === 0) {
      pendingText = text;
      pendingWrite = write;
    }
    paint();
    return;
  }
  if (typeof wx.getPrivacySetting !== "function") {
    writeClipboard(text, write);
    return;
  }
  wx.getPrivacySetting({
    success(res) {
      if (res.privacyContractName) contractName = res.privacyContractName;
      if (waiting) {
        if (resolves.length === 0) {
          pendingText = text;
          pendingWrite = write;
        }
        paint();
        return;
      }
      if (res.needAuthorization) {
        pendingText = text;
        pendingWrite = write;
        waiting = true;
        paint();
        return;
      }
      writeClipboard(text, write);
    },
    fail() {
      if (!waiting) writeClipboard(text, write);
    },
  });
}

export function agreePrivacy(buttonId: string): void {
  const text = pendingText;
  const write = pendingWrite;
  const queued = resolves.splice(0);
  pendingText = null;
  waiting = false;
  paint();
  const id = buttonId || AGREE_BUTTON_ID;
  queued.forEach((item) => {
    item.resolve({ event: "agree", buttonId: id });
  });
  if (queued.length === 0 && text != null) writeClipboard(text, write);
}

export function disagreePrivacy(): void {
  const queued = resolves.splice(0);
  pendingText = null;
  waiting = false;
  paint();
  ignorePrivacyFails += queued.length;
  queued.forEach((item) => {
    item.resolve({ event: "disagree" });
  });
  wx.showToast({ title: "未同意隐私指引，无法复制", icon: "none" });
}
