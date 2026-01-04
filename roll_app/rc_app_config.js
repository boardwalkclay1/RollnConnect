// Global Roll 'n Connect app config
const RC_APP_CONFIG_KEY = "rc_app_config";

const RC_APP_DEFAULT_CONFIG = {
  account: {
    email: "",
    passwordHint: ""
  },
  appearance: {
    theme: "bwglow", // 'dark' | 'light' | 'bwglow'
    compact: false,
    reduceMotion: false,
    highContrast: false
  },
  notifications: {
    app: true,
    mentionsOnly: false,
    marketplace: true,
    chat: true,
    events: true
  },
  privacy: {
    onlineStatus: true,
    friendRequests: true,
    strangersMessages: false,
    hideSearch: false,
    privateMode: false
  },
  sound: {
    ui: true,
    messages: true,
    marketplace: true
  },
  navigation: {
    compact: false,
    largeIcons: false,
    softGlow: true
  },
  profile: {
    displayNameOverride: "",
    cityOverride: "",
    bioOverride: ""
  }
};

function getAppConfig() {
  try {
    const raw = localStorage.getItem(RC_APP_CONFIG_KEY);
    if (!raw) {
      localStorage.setItem(
        RC_APP_CONFIG_KEY,
        JSON.stringify(RC_APP_DEFAULT_CONFIG)
      );
      return JSON.parse(JSON.stringify(RC_APP_DEFAULT_CONFIG));
    }

    const parsed = JSON.parse(raw);
    return {
      ...RC_APP_DEFAULT_CONFIG,
      ...parsed,
      appearance: { ...RC_APP_DEFAULT_CONFIG.appearance, ...(parsed.appearance || {}) },
      notifications: { ...RC_APP_DEFAULT_CONFIG.notifications, ...(parsed.notifications || {}) },
      privacy: { ...RC_APP_DEFAULT_CONFIG.privacy, ...(parsed.privacy || {}) },
      sound: { ...RC_APP_DEFAULT_CONFIG.sound, ...(parsed.sound || {}) },
      navigation: { ...RC_APP_DEFAULT_CONFIG.navigation, ...(parsed.navigation || {}) },
      profile: { ...RC_APP_DEFAULT_CONFIG.profile, ...(parsed.profile || {}) },
      account: { ...RC_APP_DEFAULT_CONFIG.account, ...(parsed.account || {}) }
    };
  } catch (e) {
    console.error("Failed to parse rc_app_config, resetting.", e);
    localStorage.setItem(
      RC_APP_CONFIG_KEY,
      JSON.stringify(RC_APP_DEFAULT_CONFIG)
    );
    return JSON.parse(JSON.stringify(RC_APP_DEFAULT_CONFIG));
  }
}

function setAppConfig(config) {
  localStorage.setItem(RC_APP_CONFIG_KEY, JSON.stringify(config));
}

// ----- UI BINDING FOR settings.html -----

function loadSettingsIntoUI() {
  const config = getAppConfig();

  document.getElementById("settings-email").value = config.account.email || "";
  document.getElementById("settings-password").value = config.account.passwordHint || "";

  document.getElementById("app-theme-dark").checked = config.appearance.theme === "dark";
  document.getElementById("app-theme-light").checked = config.appearance.theme === "light";
  document.getElementById("app-theme-bwglow").checked = config.appearance.theme === "bwglow";
  document.getElementById("app-compact").checked = !!config.appearance.compact;
  document.getElementById("app-reduce-motion").checked = !!config.appearance.reduceMotion;
  document.getElementById("app-high-contrast").checked = !!config.appearance.highContrast;

  document.getElementById("notif-app").checked = !!config.notifications.app;
  document.getElementById("notif-mentions").checked = !!config.notifications.mentionsOnly;
  document.getElementById("notif-market").checked = !!config.notifications.marketplace;
  document.getElementById("notif-chat").checked = !!config.notifications.chat;
  document.getElementById("notif-events").checked = !!config.notifications.events;

  document.getElementById("privacy-online").checked = !!config.privacy.onlineStatus;
  document.getElementById("privacy-friends").checked = !!config.privacy.friendRequests;
  document.getElementById("privacy-strangers").checked = !!config.privacy.strangersMessages;
  document.getElementById("privacy-hide-search").checked = !!config.privacy.hideSearch;
  document.getElementById("privacy-private").checked = !!config.privacy.privateMode;

  document.getElementById("sound-ui").checked = !!config.sound.ui;
  document.getElementById("sound-messages").checked = !!config.sound.messages;
  document.getElementById("sound-market").checked = !!config.sound.marketplace;

  document.getElementById("nav-compact").checked = !!config.navigation.compact;
  document.getElementById("nav-large-icons").checked = !!config.navigation.largeIcons;
  document.getElementById("nav-soft-glow").checked = !!config.navigation.softGlow;

  document.getElementById("profile-display-name").value =
    config.profile.displayNameOverride || "";
  document.getElementById("profile-city").value =
    config.profile.cityOverride || "";
  document.getElementById("profile-bio").value =
    config.profile.bioOverride || "";
}

function saveSettingsFromUI() {
  const config = getAppConfig();

  config.account.email = document.getElementById("settings-email").value.trim();
  config.account.passwordHint = document.getElementById("settings-password").value.trim();

  const themeDark = document.getElementById("app-theme-dark").checked;
  const themeLight = document.getElementById("app-theme-light").checked;
  const themeBW = document.getElementById("app-theme-bwglow").checked;

  if (themeDark) config.appearance.theme = "dark";
  else if (themeLight) config.appearance.theme = "light";
  else if (themeBW) config.appearance.theme = "bwglow";

  config.appearance.compact = document.getElementById("app-compact").checked;
  config.appearance.reduceMotion = document.getElementById("app-reduce-motion").checked;
  config.appearance.highContrast = document.getElementById("app-high-contrast").checked;

  config.notifications.app = document.getElementById("notif-app").checked;
  config.notifications.mentionsOnly = document.getElementById("notif-mentions").checked;
  config.notifications.marketplace = document.getElementById("notif-market").checked;
  config.notifications.chat = document.getElementById("notif-chat").checked;
  config.notifications.events = document.getElementById("notif-events").checked;

  config.privacy.onlineStatus = document.getElementById("privacy-online").checked;
  config.privacy.friendRequests = document.getElementById("privacy-friends").checked;
  config.privacy.strangersMessages = document.getElementById("privacy-strangers").checked;
  config.privacy.hideSearch = document.getElementById("privacy-hide-search").checked;
  config.privacy.privateMode = document.getElementById("privacy-private").checked;

  config.sound.ui = document.getElementById("sound-ui").checked;
  config.sound.messages = document.getElementById("sound-messages").checked;
  config.sound.marketplace = document.getElementById("sound-market").checked;

  config.navigation.compact = document.getElementById("nav-compact").checked;
  config.navigation.largeIcons = document.getElementById("nav-large-icons").checked;
  config.navigation.softGlow = document.getElementById("nav-soft-glow").checked;

  config.profile.displayNameOverride =
    document.getElementById("profile-display-name").value.trim();
  config.profile.cityOverride =
    document.getElementById("profile-city").value.trim();
  config.profile.bioOverride =
    document.getElementById("profile-bio").value.trim();

  setAppConfig(config);
  applyAppConfigToDOM(config);
  alert("Settings saved.");
}

// Export / import / reset

function exportAppConfig() {
  const data = localStorage.getItem(RC_APP_CONFIG_KEY) || JSON.stringify(RC_APP_DEFAULT_CONFIG);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "rc_app_config.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importAppConfig() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setAppConfig(parsed);
        const cfg = getAppConfig();
        applyAppConfigToDOM(cfg);
        if (typeof loadSettingsIntoUI === "function") {
          loadSettingsIntoUI();
        }
        alert("App config imported.");
      } catch (err) {
        alert("Invalid config file.");
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

function resetAppConfig() {
  localStorage.removeItem(RC_APP_CONFIG_KEY);
  const cfg = getAppConfig();
  applyAppConfigToDOM(cfg);
  if (typeof loadSettingsIntoUI === "function") {
    loadSettingsIntoUI();
  }
  alert("App config reset to defaults.");
}

// Apply config to DOM (for any page that includes this file)
function applyAppConfigToDOM(config) {
  config = config || getAppConfig();
  const theme = config.appearance.theme || "bwglow";
  const root = document.documentElement;

  if (theme === "dark") {
    root.style.setProperty("--rc-bg", "#050505");
    root.style.setProperty("--rc-text", "#f5f5f5");
  } else if (theme === "light") {
    root.style.setProperty("--rc-bg", "#f5f5f5");
    root.style.setProperty("--rc-text", "#050505");
  } else {
    root.style.setProperty("--rc-bg", "#000000");
    root.style.setProperty("--rc-text", "#e6e6e6");
  }

  root.style.setProperty("--rc-compact", config.appearance.compact ? "1" : "0");
  root.style.setProperty("--rc-reduce-motion", config.appearance.reduceMotion ? "1" : "0");
  root.style.setProperty("--rc-high-contrast", config.appearance.highContrast ? "1" : "0");

  root.style.setProperty("--rc-nav-compact", config.navigation.compact ? "1" : "0");
  root.style.setProperty("--rc-nav-large-icons", config.navigation.largeIcons ? "1" : "0");
  root.style.setProperty("--rc-nav-soft-glow", config.navigation.softGlow ? "1" : "0");
}

document.addEventListener("DOMContentLoaded", () => {
  const cfg = getAppConfig();
  applyAppConfigToDOM(cfg);
});
