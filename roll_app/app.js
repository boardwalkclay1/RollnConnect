// app.js — Core engine + page auto-router for RollnConnect

// ---------- Small helpers ----------
const $$ = {
  qs(sel, root = document) {
    return root.querySelector(sel);
  },
  qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  },
  on(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, fn);
  },
  getPageName() {
    return window.location.pathname.split("/").pop().toLowerCase() || "index.html";
  },
  log(...args) {
    console.log("[RollnConnect]", ...args);
  }
};

// ---------- Session / simple auth state ----------
const Session = {
  key: "rc_currentUserId",

  getCurrentUserId() {
    return localStorage.getItem(this.key);
  },

  setCurrentUserId(id) {
    if (!id) return;
    localStorage.setItem(this.key, String(id));
  },

  clear() {
    localStorage.removeItem(this.key);
  },

  async requireAuth() {
    const uid = this.getCurrentUserId();
    if (!uid) {
      window.location.href = "login.html";
      return null;
    }
    try {
      const user = await DB.get("users", Number(uid));
      if (!user) {
        this.clear();
        window.location.href = "login.html";
        return null;
      }
      return user;
    } catch (e) {
      console.error("Error loading current user:", e);
      window.location.href = "login.html";
      return null;
    }
  }
};

// ---------- Simple Auth module (local-only) ----------
const Auth = {
  // login.html
  async initLogin() {
    $$.log("Init login page");
    await DB.init();

    const form = $$.qs("#login-form");
    if (!form) return;

    $$.on(form, "submit", async (e) => {
      e.preventDefault();
      const identifier = $$.qs('[name="identifier"]', form)?.value.trim();
      const pin = $$.qs('[name="pin"]', form)?.value.trim();

      if (!identifier || !pin) {
        alert("Enter identifier and PIN.");
        return;
      }

      const users = await DB.getAll("users");
      const user = users.find(
        u => (u.email === identifier || u.username === identifier) && u.pin === pin
      );

      if (!user) {
        alert("Invalid credentials.");
        return;
      }

      Session.setCurrentUserId(user.id);
      window.location.href = "dashboard.html";
    });
  },

  // signup.html
  async initSignup() {
    $$.log("Init signup page");
    await DB.init();

    const form = $$.qs("#signup-form");
    if (!form) return;

    $$.on(form, "submit", async (e) => {
      e.preventDefault();
      const username = $$.qs('[name="username"]', form)?.value.trim();
      const email = $$.qs('[name="email"]', form)?.value.trim();
      const pin = $$.qs('[name="pin"]', form)?.value.trim();

      if (!username || !email || !pin) {
        alert("Fill out all fields.");
        return;
      }

      const users = await DB.getAll("users");
      if (users.some(u => u.email === email || u.username === username)) {
        alert("User already exists.");
        return;
      }

      const id = await DB.put("users", { username, email, pin, createdAt: Date.now() });
      Session.setCurrentUserId(id);

      // Also create a basic profile
      await DB.put("profiles", {
        id, // same as user id
        username,
        email,
        bio: "",
        city: "",
        createdAt: Date.now()
      });

      window.location.href = "profile-setup.html";
    });
  },

  logout() {
    Session.clear();
    window.location.href = "login.html";
  }
};

// ---------- Profile module ----------
const App = {}; // main namespace

App.Profile = {
  async initView() {
    $$.log("Init profile view");
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const profile = (await DB.get("profiles", user.id)) || {};
    const nameEl = $$.qs("[data-profile-name]");
    const cityEl = $$.qs("[data-profile-city]");
    const bioEl = $$.qs("[data-profile-bio]");

    if (nameEl) nameEl.textContent = profile.username || user.username || "Rider";
    if (cityEl) cityEl.textContent = profile.city || "Unknown city";
    if (bioEl) bioEl.textContent = profile.bio || "No bio yet.";

    const logoutBtn = $$.qs("[data-logout]");
    $$.on(logoutBtn, "click", () => Auth.logout());
  },

  async initEdit() {
    $$.log("Init profile edit");
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const profile = (await DB.get("profiles", user.id)) || {
      id: user.id,
      username: user.username,
      email: user.email
    };

    const form = $$.qs("#profile-edit-form");
    if (!form) return;

    const nameInput = $$.qs('[name="username"]', form);
    const cityInput = $$.qs('[name="city"]', form);
    const bioInput = $$.qs('[name="bio"]', form);

    if (nameInput) nameInput.value = profile.username || "";
    if (cityInput) cityInput.value = profile.city || "";
    if (bioInput) bioInput.value = profile.bio || "";

    $$.on(form, "submit", async (e) => {
      e.preventDefault();
      const updated = {
        id: user.id,
        username: nameInput?.value.trim() || profile.username,
        email: profile.email || user.email,
        city: cityInput?.value.trim() || "",
        bio: bioInput?.value.trim() || "",
        updatedAt: Date.now()
      };

      await DB.put("profiles", updated);
      alert("Profile saved.");
      window.location.href = "profile.html";
    });
  },

  async initSetup() {
    // For profile-setup.html, can reuse edit logic or show a variant
    await this.initEdit();
  }
};

// ---------- Chat module ----------
App.Chat = {
  async initList() {
    $$.log("Init chatrooms list");
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const listEl = $$.qs("[data-chatroom-list]");
    if (!listEl) return;

    const rooms = await DB.getAll("chatrooms");
    if (!rooms.length) {
      listEl.innerHTML = "<p>No chatrooms yet. Coming soon.</p>";
      return;
    }

    listEl.innerHTML = rooms.map(r => `
      <li>
        <a href="room-${r.slug}.html">${r.name}</a>
      </li>
    `).join("");
  },

  async initRoom() {
    $$.log("Init chatroom");
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const page = $$.getPageName(); // e.g., room-sbstreet.html
    const slug = page.replace("room-", "").replace(".html", "");

    const titleEl = $$.qs("[data-room-title]");
    if (titleEl) titleEl.textContent = slug;

    const form = $$.qs("#chat-form");
    const input = $$.qs("#chat-input");
    const listEl = $$.qs("[data-message-list]");

    async function renderMessages() {
      const all = await DB.getAll("messages");
      const msgs = all.filter(m => m.roomSlug === slug).sort((a, b) => a.createdAt - b.createdAt);
      if (!listEl) return;
      listEl.innerHTML = msgs.map(m => `
        <div class="message">
          <strong>${m.username || "Rider"}:</strong> ${m.text}
        </div>
      `).join("");
    }

    await renderMessages();

    $$.on(form, "submit", async (e) => {
      e.preventDefault();
      if (!input || !input.value.trim()) return;
      const text = input.value.trim();
      await DB.put("messages", {
        roomSlug: slug,
        userId: user.id,
        username: user.username,
        text,
        createdAt: Date.now()
      });
      input.value = "";
      await renderMessages();
    });
  }
};

// ---------- Marketplace module ----------
App.Marketplace = {
  async init() {
    $$.log("Init marketplace main");
    await DB.init();
    const container = $$.qs("[data-marketplace-list]");
    if (!container) return;

    const items = await DB.getAll("marketplace_items");
    if (!items.length) {
      container.innerHTML = "<p>No listings yet.</p>";
      return;
    }

    container.innerHTML = items.map(item => `
      <article class="market-item">
        <h3>${item.title}</h3>
        <p>${item.description || ""}</p>
        <p><strong>${item.price || ""}</strong></p>
      </article>
    `).join("");
  },

  async initSubpage() {
    $$.log("Init marketplace subpage");
    await DB.init();
    // You can branch on page name here (favorites, messages, profile, etc.)
    const page = $$.getPageName();

    if (page === "sell-item.html") {
      return this.initSellItem();
    }
    // Add more cases as needed
  },

  async initSellItem() {
    const form = $$.qs("#sell-item-form");
    if (!form) return;
    const user = await Session.requireAuth();
    if (!user) return;

    $$.on(form, "submit", async (e) => {
      e.preventDefault();
      const title = $$.qs('[name="title"]', form)?.value.trim();
      const price = $$.qs('[name="price"]', form)?.value.trim();
      const description = $$.qs('[name="description"]', form)?.value.trim();

      if (!title || !price) {
        alert("Title and price required.");
        return;
      }

      await DB.put("marketplace_items", {
        userId: user.id,
        title,
        price,
        description,
        createdAt: Date.now()
      });

      alert("Listing created.");
      window.location.href = "marketplace.html";
    });
  }
};

// ---------- Dashboard, Spots, Events, Notifications, Student Hub (light scaffolds) ----------

App.Dashboard = {
  async init() {
    $$.log("Init dashboard");
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const welcomeEl = $$.qs("[data-dashboard-welcome]");
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome back, ${user.username || "Rider"}!`;
    }
  }
};

App.Spots = {
  async init() {
    $$.log("Init spots map");
    await DB.init();
    // Future: load spots from DB and render
  }
};

App.Events = {
  async init() {
    $$.log("Init events");
    await DB.init();
    // Future: load events from DB and render
  }
};

App.Notify = {
  async initPage() {
    $$.log("Init notifications page");
    await DB.init();
    const listEl = $$.qs("[data-notifications-list]");
    if (!listEl) return;

    const notes = await DB.getAll("notifications");
    if (!notes.length) {
      listEl.innerHTML = "<p>No notifications yet.</p>";
      return;
    }

    listEl.innerHTML = notes.map(n => `
      <div class="notification">
        <p>${n.text}</p>
      </div>
    `).join("");
  }
};

App.StudentHub = {
  async init() {
    $$.log("Init student hub");
    await DB.init();
    // Future: lessons, progress, etc.
  }
};

// ---------- Global App init + auto-router ----------
App.init = async function () {
  $$.log("App init");
  await DB.init();

  const page = $$.getPageName();
  $$.log("Detected page:", page);

  // Auth
  if (page === "login.html") return Auth.initLogin();
  if (page === "signup.html") return Auth.initSignup();

  // Profile
  if (page === "profile.html") return App.Profile.initView();
  if (page === "profile-edit.html") return App.Profile.initEdit();
  if (page === "profile-setup.html") return App.Profile.initSetup();

  // Chatrooms
  if (page === "chatrooms.html") return App.Chat.initList();
  if (page.startsWith("room-")) return App.Chat.initRoom();

  // Marketplace
  if (page === "marketplace.html") return App.Marketplace.init();
  if (page.startsWith("marketplace-") || page === "sell-item.html") {
    return App.Marketplace.initSubpage();
  }

  // Dashboard
  if (page === "dashboard.html") return App.Dashboard.init();

  // Spots map
  if (page === "spots-map.html") return App.Spots.init();

  // Events
  if (page === "events.html") return App.Events.init();

  // Notifications
  if (page === "notifications.html") return App.Notify.initPage();

  // Student Hub
  if (page === "student-hub.html") return App.StudentHub.init();

  // Index or anything else
  $$.log("No specific initializer for this page. Using default (index/home).");
};

document.addEventListener("DOMContentLoaded", () => {
  App.init().catch(err => console.error("App init error:", err));
});
