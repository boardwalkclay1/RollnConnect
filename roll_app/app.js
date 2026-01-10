// app.js — RollnConnect Core Engine with Public Index + Protected Pages

// ---------- Helpers ----------
const $$ = {
  qs(sel, root = document) { return root.querySelector(sel); },
  qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); },
  on(el, ev, fn) { if (el) el.addEventListener(ev, fn); },
  page() { return window.location.pathname.split("/").pop().toLowerCase() || "index.html"; },
  log(...a) { console.log("[RC]", ...a); }
};

// ---------- Session System ----------
const Session = {
  key: "rc_currentUserId",

  getCurrentUserId() {
    return localStorage.getItem(this.key) || sessionStorage.getItem(this.key);
  },

  setCurrentUserId(id, remember = true) {
    if (remember) localStorage.setItem(this.key, String(id));
    else sessionStorage.setItem(this.key, String(id));
  },

  clear() {
    localStorage.removeItem(this.key);
    sessionStorage.removeItem(this.key);
  },

  async requireAuth() {
    const uid = this.getCurrentUserId();
    if (!uid) {
      window.location.href = "login.html";
      return null;
    }

    const user = await DB.get("users", Number(uid));
    if (!user) {
      this.clear();
      window.location.href = "login.html";
      return null;
    }

    return user;
  }
};

// ---------- Auth Module ----------
const Auth = {
  async initLogin() {
    await DB.init();
    $$.log("Login page");

    const form = $$.qs("#login-form");
    if (!form) return;

    $$.on(form, "submit", async (e) => {
      e.preventDefault();

      const identifier = $$.qs('[name="identifier"]', form)?.value.trim();
      const pin = $$.qs('[name="pin"]', form)?.value.trim();
      const remember = $$.qs('[name="remember"]', form)?.checked;

      if (!identifier || !pin) return alert("Enter identifier + PIN");

      const users = await DB.getAll("users");
      const user = users.find(
        u => (u.email === identifier || u.username === identifier) && u.pin === pin
      );

      if (!user) return alert("Invalid login");

      Session.setCurrentUserId(user.id, remember);
      window.location.href = "dashboard.html";
    });
  },

  async initSignup() {
    await DB.init();
    $$.log("Signup page");

    const form = $$.qs("#signup-form");
    if (!form) return;

    $$.on(form, "submit", async (e) => {
      e.preventDefault();

      const username = $$.qs('[name="username"]', form)?.value.trim();
      const email = $$.qs('[name="email"]', form)?.value.trim();
      const pin = $$.qs('[name="pin"]', form)?.value.trim();

      if (!username || !email || !pin) return alert("Fill all fields");

      const users = await DB.getAll("users");
      if (users.some(u => u.email === email || u.username === username))
        return alert("User already exists");

      const id = await DB.put("users", { username, email, pin, createdAt: Date.now() });

      await DB.put("profiles", {
        id,
        username,
        email,
        bio: "",
        city: "",
        createdAt: Date.now()
      });

      Session.setCurrentUserId(id, true);
      window.location.href = "profile-setup.html";
    });
  },

  logout() {
    Session.clear();
    window.location.href = "login.html";
  }
};

// ---------- Profile Module ----------
App = {};
App.Profile = {
  async initView() {
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const profile = await DB.get("profiles", user.id);

    $$.qs("[data-profile-name]").textContent = profile?.username || user.username;
    $$.qs("[data-profile-city]").textContent = profile?.city || "Unknown";
    $$.qs("[data-profile-bio]").textContent = profile?.bio || "";

    $$.on($$.qs("[data-logout]"), "click", () => Auth.logout());
  },

  async initEdit() {
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const profile = await DB.get("profiles", user.id);

    const form = $$.qs("#profile-edit-form");
    if (!form) return;

    $$.qs('[name="username"]').value = profile.username;
    $$.qs('[name="city"]').value = profile.city;
    $$.qs('[name="bio"]').value = profile.bio;

    $$.on(form, "submit", async (e) => {
      e.preventDefault();

      const updated = {
        id: user.id,
        username: $$.qs('[name="username"]').value.trim(),
        email: profile.email,
        city: $$.qs('[name="city"]').value.trim(),
        bio: $$.qs('[name="bio"]').value.trim(),
        updatedAt: Date.now()
      };

      await DB.put("profiles", updated);
      alert("Saved");
      window.location.href = "profile.html";
    });
  },

  async initSetup() {
    return this.initEdit();
  }
};

// ---------- Chat Module ----------
App.Chat = {
  async initList() {
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const list = $$.qs("[data-chatroom-list]");
    if (!list) return;

    const rooms = await DB.getAll("chatrooms");
    list.innerHTML = rooms.map(r => `<li><a href="room-${r.slug}.html">${r.name}</a></li>`).join("");
  },

  async initRoom() {
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const slug = $$.page().replace("room-", "").replace(".html", "");
    const list = $$.qs("[data-message-list]");
    const input = $$.qs("#chat-input");
    const form = $$.qs("#chat-form");

    async function render() {
      const msgs = (await DB.getAll("messages"))
        .filter(m => m.roomSlug === slug)
        .sort((a, b) => a.createdAt - b.createdAt);

      list.innerHTML = msgs.map(m => `<div><strong>${m.username}:</strong> ${m.text}</div>`).join("");
    }

    await render();

    $$.on(form, "submit", async (e) => {
      e.preventDefault();
      if (!input.value.trim()) return;

      await DB.put("messages", {
        roomSlug: slug,
        userId: user.id,
        username: user.username,
        text: input.value.trim(),
        createdAt: Date.now()
      });

      input.value = "";
      await render();
    });
  }
};

// ---------- Marketplace Module ----------
App.Marketplace = {
  async init() {
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const list = $$.qs("[data-marketplace-list]");
    if (!list) return;

    const items = await DB.getAll("marketplace_items");
    list.innerHTML = items.map(i => `
      <article>
        <h3>${i.title}</h3>
        <p>${i.description}</p>
        <strong>${i.price}</strong>
      </article>
    `).join("");
  },

  async initSubpage() {
    const page = $$.page();
    if (page === "sell-item.html") return this.initSellItem();
  },

  async initSellItem() {
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const form = $$.qs("#sell-item-form");
    if (!form) return;

    $$.on(form, "submit", async (e) => {
      e.preventDefault();

      const title = $$.qs('[name="title"]').value.trim();
      const price = $$.qs('[name="price"]').value.trim();
      const description = $$.qs('[name="description"]').value.trim();

      await DB.put("marketplace_items", {
        userId: user.id,
        title,
        price,
        description,
        createdAt: Date.now()
      });

      alert("Listing created");
      window.location.href = "marketplace.html";
    });
  }
};

// ---------- Dashboard ----------
App.Dashboard = {
  async init() {
    await DB.init();
    const user = await Session.requireAuth();
    if (!user) return;

    const el = $$.qs("[data-dashboard-welcome]");
    if (el) el.textContent = `Welcome back, ${user.username}`;
  }
};

// ---------- Public Index + Protected Links ----------
function protectLinks() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-requires-auth]");
    if (!link) return;

    const uid = Session.getCurrentUserId();
    if (!uid) {
      e.preventDefault();
      window.location.href = "login.html";
    }
  });
}

// ---------- Auto Router ----------
App.init = async function () {
  await DB.init();
  protectLinks();

  const page = $$.page();
  $$.log("Page:", page);

  if (page === "login.html") return Auth.initLogin();
  if (page === "signup.html") return Auth.initSignup();

  if (page === "profile.html") return App.Profile.initView();
  if (page === "profile-edit.html") return App.Profile.initEdit();
  if (page === "profile-setup.html") return App.Profile.initSetup();

  if (page === "chatrooms.html") return App.Chat.initList();
  if (page.startsWith("room-")) return App.Chat.initRoom();

  if (page === "marketplace.html") return App.Marketplace.init();
  if (page.startsWith("marketplace-") || page === "sell-item.html")
    return App.Marketplace.initSubpage();

  if (page === "dashboard.html") return App.Dashboard.init();

  // index.html stays PUBLIC
  if (page === "index.html") {
    $$.log("Public homepage loaded");
    return;
  }

  $$.log("No initializer for this page");
};

document.addEventListener("DOMContentLoaded", App.init);
