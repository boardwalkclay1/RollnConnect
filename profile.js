// profile.js
const RC = (() => {
  const KEYS = {
    PROFILE: "rc_profile",
    LESSONS: "rc_lessons",
    MEDIA: "rc_media",
    REVIEWS: "rc_reviews",
    MESSAGES: "rc_messages",
    CALENDAR: "rc_calendar",
    CAL_NOTIF_GLOBAL: "rc_calendar_notif_global",
    CAL_NOTIF_PER_EVENT: "rc_calendar_notif_events"
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ----- PROFILE -----
  function getProfile() {
    return (
      read(KEYS.PROFILE, null) || {
        name: "Rider Name",
        handle: "@handle",
        location: "City, Earth",
        bio: "Bio will show here. Add your style, city, and vibe.",
        tags: ["Longboard", "Dance", "Freestyle"],
        avatarUrl: "default-avatar.png"
      }
    );
  }

  function saveProfile(data) {
    write(KEYS.PROFILE, data);
  }

  // ----- LESSONS -----
  function getLessons() {
    return (
      read(KEYS.LESSONS, null) || {
        enabled: false,
        title: "",
        price: 0,
        duration: "60 minutes",
        days: [],
        startTime: "",
        endTime: "",
        description: ""
      }
    );
  }

  function saveLessons(data) {
    write(KEYS.LESSONS, data);
    // Regenerate calendar entry for lessons
    const entries = read(KEYS.CALENDAR, []);
    const others = entries.filter((e) => e.kind !== "lesson");
    if (data.enabled) {
      others.push({
        id: "lesson-slot",
        kind: "lesson",
        title: data.title || "Lessons",
        dateLabel: data.days.length ? data.days.join(", ") : "Weekly",
        timeLabel: `${data.startTime || "Flexible"} – ${data.endTime || "Flexible"}`,
        meta: `\$${data.price || 0} • ${data.duration || "60 minutes"}`
      });
    }
    write(KEYS.CALENDAR, others);
  }

  // ----- MEDIA -----
  function getMedia() {
    return read(KEYS.MEDIA, []);
  }

  function addMedia(item) {
    const list = getMedia();
    list.unshift(item);
    write(KEYS.MEDIA, list);
  }

  // ----- REVIEWS -----
  function getReviews() {
    return read(KEYS.REVIEWS, []);
  }

  function addReview(r) {
    const list = getReviews();
    list.unshift(r);
    write(KEYS.REVIEWS, list);
  }

  // ----- MESSAGES (24h) -----
  function getMessages() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const list = read(KEYS.MESSAGES, []);
    const filtered = list.filter((m) => now - m.createdAt < oneDay);
    if (filtered.length !== list.length) write(KEYS.MESSAGES, filtered);
    return filtered;
  }

  function addMessage(m) {
    const list = getMessages();
    list.push(m);
    write(KEYS.MESSAGES, list);
  }

  // ----- CALENDAR -----
  function getCalendar() {
    return read(KEYS.CALENDAR, []);
  }

  function getGlobalNotif() {
    return !!read(KEYS.CAL_NOTIF_GLOBAL, false);
  }

  function setGlobalNotif(v) {
    write(KEYS.CAL_NOTIF_GLOBAL, !!v);
  }

  function getPerEventNotif() {
    return read(KEYS.CAL_NOTIF_PER_EVENT, {});
  }

  function toggleEventNotif(id) {
    const map = getPerEventNotif();
    map[id] = !map[id];
    write(KEYS.CAL_NOTIF_PER_EVENT, map);
    return map[id];
  }

  // ========================
  // PROFILE PAGE
  // ========================
  function initProfile() {
    const profile = getProfile();
    const lessons = getLessons();
    const media = getMedia();
    const reviews = getReviews();
    const messages = getMessages();
    const calendar = getCalendar();
    const globalNotif = getGlobalNotif();

    // Basic profile display
    const pAvatar = document.getElementById("pAvatar");
    const pName = document.getElementById("pName");
    const pHandle = document.getElementById("pHandle");
    const pLocation = document.getElementById("pLocation");
    const pTags = document.getElementById("pTags");
    const pBio = document.getElementById("pBio");

    if (pAvatar) pAvatar.style.backgroundImage = `url('${profile.avatarUrl || "default-avatar.png"}')`;
    if (pName) pName.textContent = profile.name || "Rider Name";
    if (pHandle) {
      const handle = profile.handle || "@handle";
      pHandle.textContent = handle.startsWith("@") ? handle : `@${handle}`;
    }
    if (pLocation) pLocation.textContent = profile.location || "";
    if (pBio) pBio.textContent = profile.bio || "";

    if (pTags) {
      pTags.innerHTML = "";
      (profile.tags || []).forEach((tag) => {
        const div = document.createElement("div");
        div.className = "tag-pill";
        div.textContent = tag;
        pTags.appendChild(div);
      });
    }

    // Media / wheels
    const wheelsTrack = document.getElementById("wheelsTrack");
    if (wheelsTrack) {
      wheelsTrack.innerHTML = "";
      media.forEach((item) => {
        const wrap = document.createElement("div");
        wrap.className = "wheel-panel";
        wrap.innerHTML = `
          <div class="wheel-inner">
            <img class="wheel-media" src="${item.url}" alt="${item.label}" />
            <div class="wheel-label">${item.label}</div>
          </div>`;
        wheelsTrack.appendChild(wrap);
      });
    }

    const addMediaBtn = document.getElementById("addMediaBtn");
    if (addMediaBtn) {
      addMediaBtn.onclick = () => {
        const url = prompt("Paste clip or image URL (local or remote):");
        if (!url) return;
        const label = prompt("Name this wheel (e.g. Sunset line, Shared clip):") || "Clip";
        addMedia({
          id: Date.now().toString(),
          url,
          label
        });
        initProfile();
      };
    }

    // Lessons in profile
    const lessonsSection = document.getElementById("lessonsSection");
    const lessonsSummary = document.getElementById("lessonsSummary");
    const lessonsCards = document.getElementById("lessonsCards");

    if (lessonsSection) {
      if (!lessons.enabled) {
        lessonsSection.style.display = "none";
      } else {
        lessonsSection.style.display = "block";
        if (lessonsSummary) {
          lessonsSummary.textContent =
            `${lessons.title || "Lessons available"} • \$${lessons.price || 0} • ${
              lessons.duration || "60 minutes"
            } • ${lessons.days.join(", ") || "Days flexible"}`;
        }
        if (lessonsCards) {
          lessonsCards.innerHTML = "";
          const card = document.createElement("div");
          card.className = "card lesson-card";
          card.innerHTML = `
            <div class="calendar-item-header">
              <div>
                <div class="calendar-title">${lessons.title || "1:1 Lessons"}</div>
                <div class="calendar-date">${lessons.days.join(", ") || "Flexible days"} • ${
            lessons.startTime || "Flexible"
          } – ${lessons.endTime || "Flexible"}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.9rem;">\$${lessons.price || 0}</div>
                <div style="font-size:0.8rem; opacity:0.8;">${lessons.duration || "60 minutes"}</div>
              </div>
            </div>
            <p style="font-size:0.9rem; opacity:0.8; margin-top:8px;">${
              lessons.description || ""
            }</p>
            <button class="btn-primary" style="margin-top:10px; padding:8px 16px; font-size:0.85rem;">
              Book / request session
            </button>
          `;
          lessonsCards.appendChild(card);
        }
      }
    }

    // Reviews
    const reviewsList = document.getElementById("reviewsList");
    if (reviewsList) {
      reviewsList.innerHTML = "";
      reviews.forEach((r) => {
        const item = document.createElement("div");
        item.className = "message";
        item.innerHTML = `
          <div class="review-meta">${r.name || "Rider"} • ★★★★★</div>
          <div style="font-size:0.9rem;">${r.text}</div>
        `;
        reviewsList.appendChild(item);
      });
    }

    const reviewSubmit = document.getElementById("reviewSubmit");
    if (reviewSubmit) {
      reviewSubmit.onclick = () => {
        const nameEl = document.getElementById("reviewName");
        const textEl = document.getElementById("reviewText");
        const name = (nameEl?.value || "").trim();
        const text = (textEl?.value || "").trim();
        if (!text) return;
        addReview({
          id: Date.now().toString(),
          name: name || "Anonymous",
          text,
          createdAt: Date.now()
        });
        if (nameEl) nameEl.value = "";
        if (textEl) textEl.value = "";
        initProfile();
      };
    }

    // Calendar preview
    const calendarList = document.getElementById("calendarList");
    if (calendarList) {
      calendarList.innerHTML = "";
      if (!calendar.length) {
        const li = document.createElement("li");
        li.textContent = "No events saved yet.";
        li.style.opacity = "0.8";
        calendarList.appendChild(li);
      } else {
        calendar.forEach((e) => {
          const li = document.createElement("li");
          li.style.marginBottom = "6px";
          li.innerHTML = `<strong>${e.title}</strong> • ${e.dateLabel} • ${e.timeLabel}`;
          calendarList.appendChild(li);
        });
      }
    }

    // Global notification toggle
    const notifToggle = document.getElementById("notifToggle");
    const notifStatus = document.getElementById("notifStatus");
    if (notifToggle && notifStatus) {
      notifToggle.checked = globalNotif;
      notifStatus.textContent = globalNotif ? "Notifications on (local only)" : "Notifications off";
      notifToggle.onchange = () => {
        setGlobalNotif(notifToggle.checked);
        notifStatus.textContent = notifToggle.checked
          ? "Notifications on (local only)"
          : "Notifications off";
      };
    }

    // Messages
    const messagesThread = document.getElementById("messagesThread");
    const messageInput = document.getElementById("messageInput");
    const messageSend = document.getElementById("messageSend");

    if (messagesThread) {
      messagesThread.innerHTML = "";
      messages.forEach((m) => {
        const div = document.createElement("div");
        div.className = `message-bubble ${m.from === "me" ? "message-me" : "message-them"}`;
        div.innerHTML = `
          <div>${m.text}</div>
          <div class="message-meta">${new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}</div>
        `;
        messagesThread.appendChild(div);
      });
      messagesThread.scrollTop = messagesThread.scrollHeight;
    }

    if (messageSend && messageInput) {
      const send = () => {
        const text = messageInput.value.trim();
        if (!text) return;
        addMessage({
          id: Date.now().toString(),
          text,
          from: "me",
          createdAt: Date.now()
        });
        messageInput.value = "";
        initProfile();
      };
      messageSend.onclick = send;
      messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          send();
        }
      });
    }
  }

  // ========================
  // EDIT PROFILE PAGE
  // ========================
  function initProfileEdit() {
    const profile = getProfile();
    const lessons = getLessons();

    const nameEl = document.getElementById("editName");
    const handleEl = document.getElementById("editHandle");
    const locEl = document.getElementById("editLocation");
    const bioEl = document.getElementById("editBio");
    const tagsEl = document.getElementById("editTags");
    const avatarEl = document.getElementById("editAvatarUrl");

    if (nameEl) nameEl.value = profile.name || "";
    if (handleEl) handleEl.value = profile.handle || "";
    if (locEl) locEl.value = profile.location || "";
    if (bioEl) bioEl.value = profile.bio || "";
    if (tagsEl) tagsEl.value = (profile.tags || []).join(", ");
    if (avatarEl) avatarEl.value = profile.avatarUrl || "";

    const saveProfileBtn = document.getElementById("saveProfile");
    if (saveProfileBtn) {
      saveProfileBtn.onclick = () => {
        const updated = {
          ...profile,
          name: (nameEl?.value || "").trim() || "Rider Name",
          handle: (handleEl?.value || "").trim() || "@handle",
          location: (locEl?.value || "").trim(),
          bio: (bioEl?.value || "").trim(),
          tags: (tagsEl?.value || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          avatarUrl: (avatarEl?.value || "").trim() || "default-avatar.png"
        };
        saveProfile(updated);
        alert("Profile saved locally.");
      };
    }

    const enableEl = document.getElementById("lessonsEnable");
    const blockEl = document.getElementById("lessonsBlock");
    const titleEl = document.getElementById("lessonsTitle");
    const priceEl = document.getElementById("lessonsPrice");
    const durationEl = document.getElementById("lessonsDuration");
    const daysEl = document.getElementById("lessonsDays");
    const startEl = document.getElementById("lessonsStart");
    const endEl = document.getElementById("lessonsEnd");
    const descEl = document.getElementById("lessonsDescription");

    if (enableEl && blockEl) {
      enableEl.checked = !!lessons.enabled;
      blockEl.style.display = lessons.enabled ? "block" : "none";
      enableEl.onchange = () => {
        blockEl.style.display = enableEl.checked ? "block" : "none";
      };
    }

    if (titleEl) titleEl.value = lessons.title || "";
    if (priceEl) priceEl.value = lessons.price || "";
    if (durationEl) durationEl.value = lessons.duration || "";
    if (startEl) startEl.value = lessons.startTime || "";
    if (endEl) endEl.value = lessons.endTime || "";
    if (descEl) descEl.value = lessons.description || "";
    if (daysEl) {
      const setDays = new Set(lessons.days || []);
      Array.from(daysEl.options).forEach((opt) => {
        opt.selected = setDays.has(opt.value);
      });
    }

    const saveLessonsBtn = document.getElementById("saveLessons");
    if (saveLessonsBtn) {
      saveLessonsBtn.onclick = () => {
        const enabled = enableEl?.checked || false;
        let days = [];
        if (daysEl) {
          days = Array.from(daysEl.selectedOptions).map((o) => o.value);
        }
        const updated = {
          enabled,
          title: (titleEl?.value || "").trim(),
          price: Number(priceEl?.value || "0"),
          duration: (durationEl?.value || "").trim() || "60 minutes",
          days,
          startTime: startEl?.value || "",
          endTime: endEl?.value || "",
          description: (descEl?.value || "").trim()
        };
        saveLessons(updated);
        alert("Lesson settings saved locally.");
      };
    }
  }

  // ========================
  // CALENDAR PAGE
  // ========================
  function initCalendar() {
    const calendar = getCalendar();
    const perEventMap = getPerEventNotif();

    const listEl = document.getElementById("calendarFullList");
    const emptyEl = document.getElementById("calendarEmpty");
    if (!listEl || !emptyEl) return;

    if (!calendar.length) {
      emptyEl.style.display = "block";
      listEl.innerHTML = "";
      return;
    }

    emptyEl.style.display = "none";
    listEl.innerHTML = "";

    calendar.forEach((e) => {
      const li = document.createElement("li");
      li.className = "card";
      li.style.marginBottom = "14px";
      const active = perEventMap[e.id];
      li.innerHTML = `
        <div class="calendar-item-header">
          <div>
            <div class="calendar-title">${e.title}</div>
            <div class="calendar-date">${e.dateLabel} • ${e.timeLabel}</div>
          </div>
          <button class="btn-primary" style="padding:6px 12px; font-size:0.8rem; ${
            active ? "" : "background:transparent;color:#ffffff;border:1px solid rgba(255,255,255,0.7);"
          }">
            ${active ? "Notifications on" : "Notify me"}
          </button>
        </div>
        <p style="font-size:0.9rem; opacity:0.8; margin-top:8px;">${e.meta || ""}</p>
      `;
      const btn = li.querySelector("button");
      if (btn) {
        btn.onclick = () => {
          const nowActive = toggleEventNotif(e.id);
          btn.textContent = nowActive ? "Notifications on" : "Notify me";
          btn.style.background =
            nowActive ? "#ffffff" : "transparent";
          btn.style.color = nowActive ? "#000000" : "#ffffff";
          btn.style.border = nowActive ? "none" : "1px solid rgba(255,255,255,0.7)";
        };
      }
      listEl.appendChild(li);
    });
  }

  return {
    initProfile,
    initProfileEdit,
    initCalendar
  };
})();
