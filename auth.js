<!-- auth.js -->
<script>
(function () {
  const USERS_KEY = "rc_users";
  const CURRENT_USER_KEY = "rc_current_user_id";

  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function generateId() {
    return "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getCurrentUserId() {
    return localStorage.getItem(CURRENT_USER_KEY) || null;
  }

  function setCurrentUserId(id) {
    if (id) localStorage.setItem(CURRENT_USER_KEY, id);
    else localStorage.removeItem(CURRENT_USER_KEY);
  }

  function getCurrentUser() {
    const id = getCurrentUserId();
    if (!id) return null;
    const users = loadUsers();
    return users.find(u => u.id === id) || null;
  }

  function logout() {
    setCurrentUserId(null);
  }

  function findUserByIdentifier(identifier) {
    const users = loadUsers();
    const ident = identifier.trim().toLowerCase();
    return users.find(u =>
      (u.email && u.email.toLowerCase() === ident) ||
      (u.username && u.username.toLowerCase() === ident)
    ) || null;
  }

  function findUserByPin(pin) {
    const users = loadUsers();
    const clean = pin.trim();
    return users.find(u => u.pin === clean) || null;
  }

  function signupUser({ email, username, password, pin }) {
    const users = loadUsers();

    const emailNorm = email.trim().toLowerCase();
    const userNorm = username.trim().toLowerCase();
    const pinClean = (pin || "").trim();

    if (!emailNorm || !userNorm || !password.trim()) {
      throw new Error("Email, username, and password are required.");
    }

    if (users.some(u => u.email && u.email.toLowerCase() === emailNorm)) {
      throw new Error("Email already in use.");
    }

    if (users.some(u => u.username && u.username.toLowerCase() === userNorm)) {
      throw new Error("Username already in use.");
    }

    if (pinClean && users.some(u => u.pin === pinClean)) {
      throw new Error("PIN already in use.");
    }

    const user = {
      id: generateId(),
      email: emailNorm,
      username: userNorm,
      password: password, // plain for now (local dev)
      pin: pinClean || null,
      profile: {
        name: "",
        bio: "",
        avatarUrl: "",
        profileClipUrl: ""
      },
      lessons: [],
      clips: [],
      posts: []
    };

    users.push(user);
    saveUsers(users);
    setCurrentUserId(user.id);
    return user;
  }

  function loginWithPassword(identifier, password) {
    const user = findUserByIdentifier(identifier);
    if (!user) throw new Error("No user found with that email/username.");
    if (user.password !== password) throw new Error("Incorrect password.");
    setCurrentUserId(user.id);
    return user;
  }

  function loginWithPin(pin) {
    const user = findUserByPin(pin);
    if (!user) throw new Error("No user found with that PIN.");
    setCurrentUserId(user.id);
    return user;
  }

  function requireAuth(redirectTo) {
    if (!getCurrentUserId()) {
      window.location.href = redirectTo || "login.html";
    }
  }

  function getUserData() {
    return getCurrentUser();
  }

  window.RollAuth = {
    loadUsers,
    saveUsers,
    signupUser,
    loginWithPassword,
    loginWithPin,
    getCurrentUser,
    getCurrentUserId,
    setCurrentUserId,
    logout,
    requireAuth,
    getUserData
  };
})();
</script>
