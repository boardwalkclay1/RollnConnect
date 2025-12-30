const RcProfile = (() => {
  const STORAGE_KEYS = {
    PROFILE: "rc_profile_data",
    LESSONS: "rc_lessons_data",
    MEDIA: "rc_media_items",
    REVIEWS: "rc_lesson_reviews",
    MESSAGES: "rc_messages",
    CALENDAR: "rc_calendar_entries",
    NOTIFICATIONS: "rc_calendar_notifications_opt_in"
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // --- PROFILE DATA ---

  function getProfile() {
    return (
      read(STORAGE_KEYS.PROFILE, null) || {
        name: "Rider Name",
        handle: "@handle",
        location: "",
        bio: "Bio will show here. Add your style, city, and vibe.",
        tags: ["Longboard", "Dance", "Freestyle"],
        avatarUrl: "assets/images/default-avatar.jpg"
      }
    );
  }

  function saveProfile(data) {
    write(STORAGE_KEYS.PROFILE, data);
  }

  // --- LESSONS DATA ---

  function getLessons() {
    return (
      read(STORAGE_KEYS.LESSONS, null) || {
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
    write(STORAGE_KEYS.LESSONS, data);
    const now = new Date();
    const calendarEntries = [
      {
        id: "lessons-slot",
        kind: "lesson",
        title: data.title || "Lessons",
        dateLabel: "Weekly",
        timeLabel: `${data.startTime || "Flexible"} – ${data.endTime || "Flexible"}`,
        meta: `${data.days.join(", ") || "Days flexible"}`
      }
    ];
    write(STORAGE_KEYS.CALENDAR, calendarEntries);
  }

  // --- MEDIA (CLIPS + IMAGES) ---

  function getMediaItems() {
    return read(STORAGE_KEYS.MEDIA, []);
  }

  function addMediaItem(item) {
    const items = getMediaItems();
    items.unshift(item);
    write(STORAGE_KEYS.MEDIA, items);
  }

  // --- REVIEWS ---

  function getReviews() {
    return read(STORAGE_KEYS.REVIEWS, []);
  }

  function addReview(review) {
    const reviews = getReviews();
    reviews.unshift(review);
    write(STORAGE_KEYS.REVIEWS, reviews);
  }

  // --- MESSAGING (LOCAL, 24H EXPIRY) ---

  function getMessages() {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const messages = read(STORAGE_KEYS.MESSAGES, []);
    const filtered = messages.filter((m) => now - m.createdAt < twentyFourHours);
    if (filtered.length !== messages.length) {
      write(STORAGE_KEYS.MESSAGES, filtered);
    }
    return filtered;
  }

  function addMessage(message) {
    const messages = getMessages();
    messages.push(message);
    write(STORAGE_KEYS.MESSAGES, messages);
  }

  // --- NOTIFICATIONS ---

  function getNotificationsOptIn() {
    return !!read(STORAGE_KEYS.NOTIFICATIONS, false);
  }

  function setNotificationsOptIn(value) {
    write(STORAGE_KEYS.NOTIFICATIONS, !!value);
  }

  // --- CALENDAR ---

  function getCalendarEntries() {
    return read(STORAGE_KEYS.CALENDAR, []);
  }

  // ===========================
  // PROFILE PAGE INITIALIZATION
  // ===========================

  function initProfilePage() {
    const profile = getProfile();
    const lessons = getLessons();
    const media = getMediaItems();
    const reviews = getReviews();
    const messages = getMessages();
    const calendarEntries = getCalendarEntries();

    // Profile basics
    const avatarEl = document.getElementById("rcProfileAvatar");
    const nameEl = document.getElementById("rcProfileName");
    const handleEl = document.getElementById("rcProfileHandle");
    const tagsEl = document.getElementById("rcProfileTags");
    const bioEl = document.getElementById("rcProfileBio");

    if (avatarEl) {
      avatarEl.style.backgroundImage = `url('${profile.avatarUrl || "assets/images/default-avatar.jpg"}')`;
    }
    if (nameEl) nameEl.textContent = profile.name || "Rider Name";
    if (handleEl) {
      const handle = profile.handle || "@handle";
      handleEl.textContent = handle.startsWith("@") ? handle : `@${handle}`;
    }
    if (bioEl) bioEl.textContent = profile.bio || "";
    if (tagsEl) {
      tagsEl.innerHTML = "";
      (profile.tags || []).forEach((tag) => {
        const chip = document.createElement("div");
        chip.className = "rc-chip";
        chip.textContent = tag;
        tagsEl.appendChild(chip);
      });
    }

    // Media wheels
    const wheelsTrack = document.getElementById("rcWheelsTrack");
    if (wheelsTrack) {
      wheelsTrack.innerHTML = "";
      media.forEach((item) => {
        const card = document.createElement("div");
        card.className = "rc-wheel-card";
        card.innerHTML = `
          <div class="rc-wheel-inner">
            <img class="rc-wheel-media" src="${item.url}" alt="${item.label}" />
            <div class="rc-wheel-label">${item.label}</div>
          </div>
        `;
        wheelsTrack.appendChild(card);
      });

      const addMediaBtn = document.getElementById("rcAddMediaBtn");
      if (addMediaBtn) {
        addMediaBtn.addEventListener("click", () => {
          const url = prompt("Paste clip or image URL (local or remote):");
          if (!url) return;
          const label = prompt("Name this wheel (e.g. Freestyle line, Sunset run):") || "New clip";
          addMediaItem({
            id: Date.now().toString(),
            url,
            label
          });
          initProfilePage();
        });
      }
    }

    // Lessons
    const lessonsSection = document.getElementById("rcLessonsSection");
    const lessonsSummary = document.getElementById("rcLessonsSummary");
    const lessonsGrid = document.getElementById("rcLessonsGrid");

    if (lessonsSection && lessons.enabled) {
      lessonsSection.style.display = "block";

      if (lessonsSummary) {
        lessonsSummary.textContent =
          `${lessons.title || "Lessons available"} • $${lessons.price || 0} • ${
            lessons.duration || "60 minutes"
          } • ${lessons.days.join(", ") || "Days flexible"}`;
      }

      if (lessonsGrid) {
        lessonsGrid.innerHTML = "";
        const card = document.createElement("div");
        card.className = "rc-lesson-card";
        card.innerHTML = `
          <div class="rc-lesson-main">
            <div class="rc-lesson-title">${lessons.title || "1:1 Lessons"}</div>
            <div class="rc-lesson-meta">
              $${lessons.price || 0} • ${lessons.duration || "60 minutes"} •
              ${lessons.days.join(", ") || "Days flexible"}
            </div>
            <div class="rc-lesson-meta">
              Time: ${lessons.startTime || "Flexible"} – ${lessons.endTime || "Flexible"}
            </div>
            <div class="rc-lesson-meta">
              ${lessons.description || ""}
            </div>
          </div>
          <div>
            <button class="rc-btn">Book</button>
          </div>
        `;
        lessonsGrid.appendChild(card);
      }
    } else if (lessonsSection) {
      lessonsSection.style.display = "none";
    }

    // Reviews
    const reviewsListEl = document.getElementById("rcReviewsList");
    if (reviewsListEl) {
      reviewsListEl.innerHTML = "";
      reviews.forEach((rev) => {
        const item = document.createElement("div");
        item.className = "rc-review-item";
        item.innerHTML = `
          <div class="rc-review-meta">${rev.name || "Rider"} • ★★★★★</div>
          <div>${rev.text}</div>
        `;
        reviewsListEl.appendChild(item);
      });

      const submitBtn = document.getElementById("rcSubmitReviewBtn");
      if (submitBtn) {
        submitBtn.addEventListener("click", () => {
          const nameInput = document.getElementById("rcReviewName");
          const textInput = document.getElementById("rcReviewText");
          const name = (nameInput?.value || "").trim();
          const text = (textInput?.value || "").trim();
          if (!text) return;
          addReview({
            id: Date.now().toString(),
            name: name || "Anonymous",
            text,
            createdAt: Date.now()
          });
          if (nameInput) nameInput.value = "";
          if (textInput) textInput.value = "";
          initProfilePage();
        });
      }
    }

    // Calendar preview
    const calendarListEl = document.getElementById("rcCalendarList");
    if (calendarListEl) {
      calendarListEl.innerHTML = "";
      calendarEntries.forEach((entry) => {
        const li = document.createElement("li");
        li.style.marginBottom = "4px";
        li.textContent = `${entry.title} • ${entry.dateLabel} • ${entry.timeLabel}`;
        calendarListEl.appendChild(li);
      });
      if (calendarEntries.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No upcoming lessons or events saved yet.";
        calendarListEl.appendChild(li);
      }
    }

    // Notifications toggle
    const notificationsToggle = document.getElementById("rcNotificationsToggle");
    const chip = document.getElementById("rcCalendarNotificationsChip");
    if (notificationsToggle && chip) {
      const optIn = getNotificationsOptIn();
      notificationsToggle.checked = optIn;
      chip.textContent = optIn ? "Notifications on (local)" : "Notifications off";

      notificationsToggle.addEventListener("change", () => {
        setNotificationsOptIn(notificationsToggle.checked);
        chip.textContent = notificationsToggle.checked
          ? "Notifications on (local)"
          : "Notifications off";
      });
    }

    // Messages
    const threadEl = document.getElementById("rcMessagesThread");
    const inputEl = document.getElementById("rcMessageInput");
    const sendBtn = document.getElementById("rcSendMessageBtn");

    if (threadEl) {
      threadEl.innerHTML = "";
      messages.forEach((m) => {
        const bubble = document.createElement("div");
        bubble.className = `rc-message-bubble ${m.from === "me" ? "me" : "them"}`;
        bubble.innerHTML = `
          <div>${m.text}</div>
          <div class="rc-message-meta">${new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}</div>
        `;
        threadEl.appendChild(bubble);
      });
      threadEl.scrollTop = threadEl.scrollHeight;
    }

    if (sendBtn && inputEl) {
      sendBtn.addEventListener("click", () => {
        const text = inputEl.value.trim();
        if (!text) return;
        addMessage({
          id: Date.now().toString(),
          text,
          from: "me",
          createdAt: Date.now()
        });
        inputEl.value = "";
        initProfilePage();
      });

      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          sendBtn.click();
        }
      });
    }
  }

  // ===========================
  // EDIT PROFILE PAGE
  // ===========================

  function initEditProfilePage() {
    const profile = getProfile();
    const lessons = getLessons();

    const nameInput = document.getElementById("rcEditName");
    const handleInput = document.getElementById("rcEditHandle");
    const locInput = document.getElementById("rcEditLocation");
    const bioInput = document.getElementById("rcEditBio");
    const tagsInput = document.getElementById("rcEditTags");
    const avatarInput = document.getElementById("rcEditAvatarUrl");

    if (nameInput) nameInput.value = profile.name || "";
    if (handleInput) handleInput.value = profile.handle || "";
    if (locInput) locInput.value = profile.location || "";
    if (bioInput) bioInput.value = profile.bio || "";
    if (tagsInput) tagsInput.value = (profile.tags || []).join(", ");
    if (avatarInput) avatarInput.value = profile.avatarUrl || "";

    const enableLessonsToggle = document.getElementById("rcEnableLessonsToggle");
    const lessonsBlock = document.getElementById("rcLessonsSettingsBlock");

    if (enableLessonsToggle && lessonsBlock) {
      enableLessonsToggle.checked = !!lessons.enabled;
      lessonsBlock.style.display = lessons.enabled ? "block" : "none";

      enableLessonsToggle.addEventListener("change", () => {
        lessonsBlock.style.display = enableLessonsToggle.checked ? "block" : "none";
      });
    }

    const lessonTitleInput = document.getElementById("rcLessonTitle");
    const lessonPriceInput = document.getElementById("rcLessonPrice");
    const lessonDurationInput = document.getElementById("rcLessonDuration");
    const lessonDaysSelect = document.getElementById("rcLessonDays");
    const lessonStartTimeInput = document.getElementById("rcLessonStartTime");
    const lessonEndTimeInput = document.getElementById("rcLessonEndTime");
    const lessonDescriptionInput = document.getElementById("rcLessonDescription");

    if (lessonTitleInput) lessonTitleInput.value = lessons.title || "";
    if (lessonPriceInput) lessonPriceInput.value = lessons.price || "";
    if (lessonDurationInput) lessonDurationInput.value = lessons.duration || "";
    if (lessonStartTimeInput) lessonStartTimeInput.value = lessons.startTime || "";
    if (lessonEndTimeInput) lessonEndTimeInput.value = lessons.endTime || "";
    if (lessonDescriptionInput) lessonDescriptionInput.value = lessons.description || "";

    if (lessonDaysSelect) {
      const existing = new Set(lessons.days || []);
      Array.from(lessonDaysSelect.options).forEach((opt) => {
        opt.selected = existing.has(opt.value);
      });
    }

    const saveProfileBtn = document.getElementById("rcSaveProfileBtn");
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener("click", () => {
        const updatedProfile = {
          ...profile,
          name: (nameInput?.value || "").trim() || "Rider Name",
          handle: (handleInput?.value || "").trim() || "@handle",
          location: (locInput?.value || "").trim(),
          bio: (bioInput?.value || "").trim(),
          tags: (tagsInput?.value || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          avatarUrl: (avatarInput?.value || "").trim() || "assets/images/default-avatar.jpg"
        };
        saveProfile(updatedProfile);
        alert("Profile saved locally.");
      });
    }

    const saveLessonsBtn = document.getElementById("rcSaveLessonsBtn");
    if (saveLessonsBtn) {
      saveLessonsBtn.addEventListener("click", () => {
        const enabled = enableLessonsToggle?.checked || false;
        let selectedDays = [];
        if (lessonDaysSelect) {
          selectedDays = Array.from(lessonDaysSelect.selectedOptions).map((o) => o.value);
        }
        const updatedLessons = {
          enabled,
          title: (lessonTitleInput?.value || "").trim(),
          price: Number(lessonPriceInput?.value || "0"),
          duration: (lessonDurationInput?.value || "").trim() || "60 minutes",
          days: selectedDays,
          startTime: lessonStartTimeInput?.value || "",
          endTime: lessonEndTimeInput?.value || "",
          description: (lessonDescriptionInput?.value || "").trim()
        };
        saveLessons(updatedLessons);
        alert("Lesson settings saved locally.");
      });
    }
  }

  return {
    initProfilePage,
    initEditProfilePage
  };
})();
