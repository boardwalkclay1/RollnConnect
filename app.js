/* ---------------------------------------------------------
   Roll ’n Connect — Global App JS
   One file powering: theme, rooms, chat, profile, city pages
--------------------------------------------------------- */

window.App = (function () {
  /* ------------------ Utilities ------------------ */

  function getJSON(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function setJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function nowTime() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  /* ------------------ Theme ------------------ */

  const Theme = {
    init(toggleBtnId) {
      const btn = document.getElementById(toggleBtnId);
      const saved = localStorage.getItem("chat_theme") || "dark";
      Theme.set(saved, btn);
      if (btn) {
        btn.addEventListener("click", () => {
          const current = localStorage.getItem("chat_theme") || "dark";
          const next = current === "dark" ? "light" : "dark";
          Theme.set(next, btn);
        });
      }
    },
    set(mode, btn) {
      document.body.classList.remove("light-theme", "dark-theme");
      document.body.classList.add(mode + "-theme");
      localStorage.setItem("chat_theme", mode);
      if (btn) btn.textContent = mode === "dark" ? "Dark" : "Light";
    }
  };

  /* ------------------ Rooms / Active users ------------------ */

  const Rooms = {
    enter(city, discipline, username) {
      const key = `active_${city}_${discipline}`;
      let list = getJSON(key, []);
      if (!list.includes(username)) {
        list.push(username);
        setJSON(key, list);
      }
    },
    leave(city, discipline, username) {
      const key = `active_${city}_${discipline}`;
      let list = getJSON(key, []);
      list = list.filter(u => u !== username);
      setJSON(key, list);
    },
    count(city, discipline) {
      const key = `active_${city}_${discipline}`;
      return getJSON(key, []).length;
    },
    updateCityCounts(city, disciplines) {
      disciplines.forEach(d => {
        const el = document.getElementById(`count-${d}`);
        if (el) {
          const c = Rooms.count(city, d);
          el.textContent = `${c} in room`;
        }
      });
    }
  };

  /* ------------------ Notifications ------------------ */

  const Notify = {
    key: "notifications",
    get() {
      return getJSON(Notify.key, []);
    },
    set(list) {
      setJSON(Notify.key, list);
    },
    add(text, roomLabel) {
      const list = Notify.get();
      list.unshift({
        text,
        time: nowTime(),
        room: roomLabel
      });
      Notify.set(list.slice(0, 50));
    },
    init(bubbleId, panelId, countId) {
      const bubble = document.getElementById(bubbleId);
      const panel = document.getElementById(panelId);
      const countEl = document.getElementById(countId);
      if (!bubble || !panel || !countEl) return;

      function render() {
        const list = Notify.get();
        const count = list.length;
        if (count > 0) {
          countEl.style.display = "flex";
          countEl.textContent = count > 9 ? "9+" : count;
        } else {
          countEl.style.display = "none";
        }
        panel.innerHTML = list.length
          ? list.map(n => `
              <div class="notif-item">
                <strong>${n.room}</strong><br/>
                ${n.text}<br/>
                <span style="color:var(--dark-muted);">${n.time}</span>
              </div>
            `).join("")
          : "<div class='notif-item'>No notifications yet.</div>";
      }

      render();

      let open = false;
      bubble.addEventListener("click", () => {
        open = !open;
        panel.style.display = open ? "block" : "none";
        if (open) countEl.style.display = "none";
      });

      Notify.render = render; // allow external refresh if needed
    }
  };

  /* ------------------ Chat engine ------------------ */

  const Chat = {
    initRoom(opts) {
      const {
        city,
        discipline,
        roomLabel,
        messagesId,
        inputId,
        sendBtnId,
        emojiSelector,
        quickSelector,
        themeToggleId,
        notifBubbleId,
        notifPanelId,
        notifCountId,
        privateGroupBtnId
      } = opts;

      const username = localStorage.getItem("username") || "Skater";
      const roomKey = `chat_${city}_${discipline}`;

      // Active users
      Rooms.enter(city, discipline, username);
      window.addEventListener("beforeunload", () => {
        Rooms.leave(city, discipline, username);
      });

      // Theme + notifications
      if (themeToggleId) Theme.init(themeToggleId);
      if (notifBubbleId && notifPanelId && notifCountId) {
        Notify.init(notifBubbleId, notifPanelId, notifCountId);
      }

      const messagesEl = document.getElementById(messagesId);
      const input = document.getElementById(inputId);
      const sendBtn = document.getElementById(sendBtnId);

      if (!messagesEl || !input || !sendBtn) return;

      let messages = getJSON(roomKey, []);

      function renderMessages() {
        messagesEl.innerHTML = "";
        messages.forEach(m => {
          const row = document.createElement("div");
          row.className = "msg-row" + (m.user === username ? " me" : "");
          const meta = document.createElement("div");
          meta.className = "msg-meta";
          meta.textContent = (m.type === "system" ? "" : m.user + " · ") + m.time;
          const bubble = document.createElement("div");
          bubble.className = "msg-bubble" + (m.type === "system" ? " system" : "");
          bubble.textContent = m.text;
          row.appendChild(meta);
          row.appendChild(bubble);
          messagesEl.appendChild(row);
        });
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      function addMessage(text, type = "user") {
        if (!text.trim()) return;
        const msg = {
          user: username,
          text,
          time: nowTime(),
          type
        };
        messages.push(msg);
        setJSON(roomKey, messages);
        renderMessages();
        if (type === "system") {
          Notify.add(text, roomLabel);
          if (typeof Notify.render === "function") Notify.render();
        }
      }

      renderMessages();

      sendBtn.addEventListener("click", () => {
        addMessage(input.value, "user");
        input.value = "";
      });

      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          addMessage(input.value, "user");
          input.value = "";
        }
      });

      // Emoji bar
      if (emojiSelector) {
        document.querySelectorAll(emojiSelector).forEach(btn => {
          btn.addEventListener("click", () => {
            const emoji = btn.dataset.emoji;
            input.value += emoji;
            input.focus();
          });
        });
      }

      // Quick actions
      if (quickSelector) {
        document.querySelectorAll(quickSelector).forEach(btn => {
          btn.addEventListener("click", () => {
            const type = btn.dataset.type;
            let text = "";
            if (type === "invite") {
              text = `${username} sent an invite to skate 📨`;
            } else if (type === "hug") {
              text = `${username} sends a big skate hug 🤗`;
            } else if (type === "kiss") {
              text = `${username} blows a kiss 💋`;
            }
            addMessage(text, "system");
          });
        });
      }

      // Private groups (MVP)
      if (privateGroupBtnId) {
        const btn = document.getElementById(privateGroupBtnId);
        if (btn) {
          btn.addEventListener("click", () => {
            const name = prompt("Name your private group:");
            if (!name) return;
            const groups = getJSON("private_groups", []);
            groups.push({
              name,
              createdBy: username,
              city,
              discipline,
              createdAt: new Date().toISOString()
            });
            setJSON("private_groups", groups);
            Notify.add(`Private group “${name}” created.`, roomLabel);
            if (typeof Notify.render === "function") Notify.render();
            alert("Private group created (MVP). Later this becomes a real private room.");
          });
        }
      }
    }
  };

  /* ------------------ Profile (view + edit) ------------------ */

  const Profile = {
    loadBasic() {
      return {
        username: localStorage.getItem("username") || "Skater",
        city: localStorage.getItem("profile_city") || "",
        disciplines: localStorage.getItem("profile_disciplines") || "",
        bio: localStorage.getItem("profile_bio") || ""
      };
    },
    saveBasic({ username, city, disciplines, bio }) {
      if (username) localStorage.setItem("username", username.trim());
      localStorage.setItem("profile_city", (city || "").trim());
      localStorage.setItem("profile_disciplines", (disciplines || "").trim());
      localStorage.setItem("profile_bio", (bio || "").trim());
    },
    loadMedia() {
      return {
        photos: getJSON("user_photos", []),
        videos: getJSON("user_videos", [])
      };
    },
    saveMedia({ photos, videos }) {
      setJSON("user_photos", photos || []);
      setJSON("user_videos", videos || []);
    },
    loadLessons() {
      const enabled = localStorage.getItem("lessons_enabled") === "true";
      const info = getJSON("lesson_info", {}) || {};
      return { enabled, info };
    },
    saveLessons({ enabled, info }) {
      localStorage.setItem("lessons_enabled", enabled ? "true" : "false");
      if (enabled) {
        setJSON("lesson_info", info || {});
      } else {
        localStorage.removeItem("lesson_info");
      }
    },

    initView(opts) {
      const {
        usernameId,
        cityId,
        disciplinesId,
        bioId,
        avatarId,
        photosGridId,
        videosGridId,
        tabPhotosId,
        tabVideosId,
        lessonsContainerId
      } = opts;

      const basic = Profile.loadBasic();
      const media = Profile.loadMedia();
      const lessons = Profile.loadLessons();

      const usernameEl = document.getElementById(usernameId);
      const cityEl = document.getElementById(cityId);
      const discEl = document.getElementById(disciplinesId);
      const bioEl = document.getElementById(bioId);
      const avatarEl = document.getElementById(avatarId);

      if (usernameEl) usernameEl.textContent = basic.username;
      if (cityEl) cityEl.textContent = basic.city;
      if (discEl) discEl.textContent = basic.disciplines;
      if (bioEl) bioEl.textContent = basic.bio;
      if (avatarEl) {
        const initial = basic.username.trim()[0] || "R";
        avatarEl.textContent = initial.toUpperCase();
      }

      const photosGrid = document.getElementById(photosGridId);
      const videosGrid = document.getElementById(videosGridId);

      if (photosGrid && Array.isArray(media.photos)) {
        photosGrid.innerHTML = "";
        media.photos.forEach(url => {
          const div = document.createElement("div");
          div.className = "media-item";
          div.innerHTML = `<img src="${url}" alt="Photo" />`;
          photosGrid.appendChild(div);
        });
      }

      if (videosGrid && Array.isArray(media.videos)) {
        videosGrid.innerHTML = "";
        media.videos.forEach(url => {
          const div = document.createElement("div");
          div.className = "media-item";
          div.innerHTML = `<video src="${url}" controls muted playsinline></video>`;
          videosGrid.appendChild(div);
        });
      }

      if (tabPhotosId && tabVideosId && photosGrid && videosGrid) {
        const tabP = document.getElementById(tabPhotosId);
        const tabV = document.getElementById(tabVideosId);
        if (tabP && tabV) {
          tabP.addEventListener("click", () => {
            tabP.classList.add("active");
            tabV.classList.remove("active");
            photosGrid.style.display = "grid";
            videosGrid.style.display = "none";
          });
          tabV.addEventListener("click", () => {
            tabV.classList.add("active");
            tabP.classList.remove("active");
            photosGrid.style.display = "none";
            videosGrid.style.display = "grid";
          });
        }
      }

      if (lessonsContainerId) {
        const container = document.getElementById(lessonsContainerId);
        if (container && lessons.enabled) {
          const info = lessons.info || {};
          const price = info.price || "";
          const loc = info.location || "";
          const level = info.level || "";
          const desc = info.description || "";
          const wrapper = document.createElement("div");
          wrapper.className = "lessons-card";
          wrapper.innerHTML = `
            <div class="lessons-header">
              <div>Lessons</div>
              <div class="lessons-price">${price}</div>
            </div>
            <div class="lessons-meta">
              ${loc ? loc + " · " : ""}${level}
            </div>
            <div class="lessons-desc">${desc}</div>
            <div class="lessons-cta">Lesson booking coming soon.</div>
          `;
          container.appendChild(wrapper);
        }
      }
    },

    initEdit(opts) {
      const {
        usernameId,
        cityId,
        disciplinesId,
        bioId,
        photoInputId,
        photoListId,
        videoInputId,
        videoListId,
        lessonsToggleId,
        lessonFieldsId,
        lessonPriceId,
        lessonLocationId,
        lessonLevelId,
        lessonDescriptionId,
        formId,
        pillSelector
      } = opts;

      const basic = Profile.loadBasic();
      const media = Profile.loadMedia();
      const lessons = Profile.loadLessons();

      const usernameInput = document.getElementById(usernameId);
      const cityInput = document.getElementById(cityId);
      const discInput = document.getElementById(disciplinesId);
      const bioInput = document.getElementById(bioId);

      if (usernameInput) usernameInput.value = basic.username;
      if (cityInput) cityInput.value = basic.city;
      if (discInput) discInput.value = basic.disciplines;
      if (bioInput) bioInput.value = basic.bio;

      let photos = media.photos || [];
      let videos = media.videos || [];

      function renderMediaLists() {
        const photoList = document.getElementById(photoListId);
        const videoList = document.getElementById(videoListId);
        if (photoList) {
          photoList.innerHTML = photos.length
            ? "Photos: " + photos.join(", ")
            : "No photos added yet.";
        }
        if (videoList) {
          videoList.innerHTML = videos.length
            ? "Videos: " + videos.join(", ")
            : "No videos added yet.";
        }
      }
      renderMediaLists();

      const lessonsToggle = document.getElementById(lessonsToggleId);
      const lessonFields = document.getElementById(lessonFieldsId);
      const priceInput = document.getElementById(lessonPriceId);
      const locInput = document.getElementById(lessonLocationId);
      const levelInput = document.getElementById(lessonLevelId);
      const descInput = document.getElementById(lessonDescriptionId);

      if (lessonsToggle && lessonFields) {
        lessonsToggle.checked = lessons.enabled;
        lessonFields.style.display = lessons.enabled ? "block" : "none";
        lessonsToggle.addEventListener("change", () => {
          lessonFields.style.display = lessonsToggle.checked ? "block" : "none";
        });
      }

      if (priceInput) priceInput.value = lessons.info.price || "";
      if (locInput) locInput.value = lessons.info.location || "";
      if (levelInput) levelInput.value = lessons.info.level || "";
      if (descInput) descInput.value = lessons.info.description || "";

      if (pillSelector && discInput) {
        document.querySelectorAll(pillSelector).forEach(pill => {
          const val = pill.dataset.disc;
          const current = discInput.value.split(",").map(x => x.trim()).filter(Boolean);
          if (current.includes(val)) {
            pill.classList.add("active");
          }
          pill.addEventListener("click", () => {
            pill.classList.toggle("active");
            const list = discInput.value
              ? discInput.value.split(",").map(x => x.trim()).filter(Boolean)
              : [];
            const idx = list.indexOf(val);
            if (pill.classList.contains("active")) {
              if (idx === -1) list.push(val);
            } else {
              if (idx !== -1) list.splice(idx, 1);
            }
            discInput.value = list.join(", ");
          });
        });
      }

      const photoInput = document.getElementById(photoInputId);
      const videoInput = document.getElementById(videoInputId);

      if (photoInput) {
        photoInput.addEventListener("change", () => {});
      }

      if (photoInput) {
        photoInput.addEventListener("keydown", e => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        });
      }

      if (videoInput) {
        videoInput.addEventListener("keydown", e => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        });
      }

      // Buttons to add media (call these manually from HTML via onclick)
      window.AppAddPhoto = function (inputIdOverride) {
        const inp = document.getElementById(inputIdOverride || photoInputId);
        if (!inp) return;
        const url = inp.value.trim();
        if (!url) return;
        photos.push(url);
        Profile.saveMedia({ photos, videos });
        inp.value = "";
        renderMediaLists();
      };

      window.AppAddVideo = function (inputIdOverride) {
        const inp = document.getElementById(inputIdOverride || videoInputId);
        if (!inp) return;
        const url = inp.value.trim();
        if (!url) return;
        videos.push(url);
        Profile.saveMedia({ photos, videos });
        inp.value = "";
        renderMediaLists();
      };

      const form = document.getElementById(formId);
      if (form) {
        form.addEventListener("submit", e => {
          e.preventDefault();

          Profile.saveBasic({
            username: usernameInput ? usernameInput.value : "",
            city: cityInput ? cityInput.value : "",
            disciplines: discInput ? discInput.value : "",
            bio: bioInput ? bioInput.value : ""
          });

          const enabled = lessonsToggle ? lessonsToggle.checked : false;
          const info = {
            price: priceInput ? priceInput.value.trim() : "",
            location: locInput ? locInput.value.trim() : "",
            level: levelInput ? levelInput.value.trim() : "",
            description: descInput ? descInput.value.trim() : ""
          };
          Profile.saveLessons({ enabled, info });

          window.location.href = "profile.html";
        });
      }
    }
  };

  /* ------------------ City page init ------------------ */

  const CityPage = {
    init(city) {
      const discs = [
        "longboard",
        "downhill",
        "street",
        "roller",
        "inline",
        "cruising",
        "beginners",
        "rinks"
      ];
      Rooms.updateCityCounts(city, discs);
      const yearEl = document.getElementById("year");
      if (yearEl) yearEl.textContent = new Date().getFullYear();
    }
  };

  /* ------------------ Public API ------------------ */

  return {
    Theme,
    Rooms,
    Notify,
    Chat,
    Profile,
    CityPage,
    getJSON,
    setJSON
  };
})();
