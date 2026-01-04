function toggleMenu() {
  document.querySelector('.side-menu').classList.toggle('open');
}

const DEFAULT_CONFIG = {
  profile: {
    displayName: null,
    location: null,
    showCity: true,
    showUsername: true
  },
  display: {
    darkMode: true,
    compactMode: false,
    animations: true
  },
  notifications: {
    newMessages: true,
    newOffers: true,
    priceDrops: true,
    restocks: true
  },
  privacy: {
    requireDeleteConfirm: true,
    hideFromSearch: false,
    privateMode: false
  }
};

function loadConfig() {
  let config = JSON.parse(localStorage.getItem("rc_market_config") || "null");
  if (!config) {
    config = DEFAULT_CONFIG;
    localStorage.setItem("rc_market_config", JSON.stringify(config));
  }

  document.getElementById("darkMode").checked = config.display.darkMode;
  document.getElementById("compactMode").checked = config.display.compactMode;
  document.getElementById("animations").checked = config.display.animations;

  document.getElementById("notifMessages").checked = config.notifications.newMessages;
  document.getElementById("notifOffers").checked = config.notifications.newOffers;
  document.getElementById("notifDrops").checked = config.notifications.priceDrops;
  document.getElementById("notifRestocks").checked = config.notifications.restocks;

  document.getElementById("privacyConfirm").checked = config.privacy.requireDeleteConfirm;
  document.getElementById("privacyHide").checked = config.privacy.hideFromSearch;
  document.getElementById("privacyPrivate").checked = config.privacy.privateMode;
}

function saveConfig() {
  const config = {
    profile: DEFAULT_CONFIG.profile,
    display: {
      darkMode: document.getElementById("darkMode").checked,
      compactMode: document.getElementById("compactMode").checked,
      animations: document.getElementById("animations").checked
    },
    notifications: {
      newMessages: document.getElementById("notifMessages").checked,
      newOffers: document.getElementById("notifOffers").checked,
      priceDrops: document.getElementById("notifDrops").checked,
      restocks: document.getElementById("notifRestocks").checked
    },
    privacy: {
      requireDeleteConfirm: document.getElementById("privacyConfirm").checked,
      hideFromSearch: document.getElementById("privacyHide").checked,
      privateMode: document.getElementById("privacyPrivate").checked
    }
  };

  localStorage.setItem("rc_market_config", JSON.stringify(config));
}

function exportConfig() {
  const data = localStorage.getItem("rc_market_config");
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "marketplace-settings.json";
  a.click();
}

function importConfig() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      localStorage.setItem("rc_market_config", reader.result);
      loadConfig();
      alert("Settings imported.");
    };

    reader.readAsText(file);
  };

  input.click();
}

function resetConfig() {
  localStorage.removeItem("rc_market_config");
  loadConfig();
  alert("Marketplace settings reset.");
}

document.addEventListener("DOMContentLoaded", () => {
  loadConfig();
  document.querySelectorAll("input[type='checkbox']").forEach(el => {
    el.addEventListener("change", saveConfig);
  });
});
