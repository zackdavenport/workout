(() => {
  "use strict";

  /* ---------------- storage ---------------- */

  const LS_SESSIONS = "ironlog_sessions_v1";
  const LS_CUSTOM = "ironlog_custom_exercises_v1";

  const load = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error("Failed to read", key, e);
      return fallback;
    }
  };

  const save = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Failed to save", key, e);
      showToast("Couldn't save — storage may be full");
    }
  };

  let sessions = load(LS_SESSIONS, []);          // [{id, dateKey, dateLabel, entries:[...]}]
  let customExercises = load(LS_CUSTOM, []);      // same shape as BUILTIN_EXERCISES

  const persistSessions = () => save(LS_SESSIONS, sessions);
  const persistCustom = () => save(LS_CUSTOM, customExercises);

  /* ---------------- helpers ---------------- */

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatDateLabel = (dateKey) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const todayK = todayKey();
    const yestDate = new Date();
    yestDate.setDate(yestDate.getDate() - 1);
    const yestKey = `${yestDate.getFullYear()}-${String(yestDate.getMonth() + 1).padStart(2, "0")}-${String(yestDate.getDate()).padStart(2, "0")}`;
    if (dateKey === todayK) return "Today";
    if (dateKey === yestKey) return "Yesterday";
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const allExercises = () => [...BUILTIN_EXERCISES, ...customExercises];

  const getOrCreateTodaySession = () => {
    const key = todayKey();
    let s = sessions.find((x) => x.dateKey === key);
    if (!s) {
      s = { id: uid(), dateKey: key, entries: [] };
      sessions.unshift(s);
      persistSessions();
    }
    return s;
  };

  const defaultSet = () => ({ id: uid(), reps: "", weight: "", bodyweight: false });

  /* ---------------- toast ---------------- */

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 1800);
  }

  /* ---------------- tabs ---------------- */

  const tabs = document.querySelectorAll(".tab");
  const views = { today: document.getElementById("view-today"), history: document.getElementById("view-history") };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      Object.values(views).forEach((v) => v.classList.remove("is-active"));
      views[tab.dataset.view].classList.add("is-active");
      if (tab.dataset.view === "history") renderHistory();
    });
  });

  /* ---------------- today view rendering ---------------- */

  const todayDateLabelEl = document.getElementById("today-date-label");
  const todayEntriesEl = document.getElementById("today-entries");
  const todayEmptyEl = document.getElementById("today-empty");

  function renderToday() {
    const session = getOrCreateTodaySession();
    todayDateLabelEl.textContent = formatDateLabel(session.dateKey);

    todayEntriesEl.innerHTML = "";
    if (session.entries.length === 0) {
      todayEmptyEl.classList.add("is-visible");
    } else {
      todayEmptyEl.classList.remove("is-visible");
      session.entries.forEach((entry) => todayEntriesEl.appendChild(renderEntryCard(session, entry)));
    }
  }

  function renderEntryCard(session, entry) {
    const card = document.createElement("div");
    card.className = "entry-card";

    const head = document.createElement("div");
    head.className = "entry-head";
    head.innerHTML = `
      <div class="entry-title-group">
        <div class="entry-name"></div>
        <div class="entry-muscles"></div>
      </div>
      <button class="entry-remove" aria-label="Remove exercise">&times;</button>
    `;
    head.querySelector(".entry-name").textContent = entry.name;
    head.querySelector(".entry-muscles").textContent = entry.muscles.join(" · ");
    head.querySelector(".entry-remove").addEventListener("click", () => {
      session.entries = session.entries.filter((e) => e.id !== entry.id);
      persistSessions();
      renderToday();
    });
    card.appendChild(head);

    const setsHeader = document.createElement("div");
    setsHeader.className = "sets-header";
    setsHeader.innerHTML = `<span></span><span>Reps</span><span>Weight (kg)</span><span></span>`;
    card.appendChild(setsHeader);

    entry.sets.forEach((set, idx) => card.appendChild(renderSetRow(session, entry, set, idx)));

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    actions.innerHTML = `
      <button class="set-adjust-btn" data-action="add">+ Add set</button>
      <button class="set-adjust-btn" data-action="remove">− Remove set</button>
    `;
    actions.querySelector('[data-action="add"]').addEventListener("click", () => {
      entry.sets.push(defaultSet());
      persistSessions();
      renderToday();
    });
    actions.querySelector('[data-action="remove"]').addEventListener("click", () => {
      if (entry.sets.length <= 1) {
        showToast("An exercise needs at least one set");
        return;
      }
      entry.sets.pop();
      persistSessions();
      renderToday();
    });
    card.appendChild(actions);

    return card;
  }

  function renderSetRow(session, entry, set, idx) {
    const row = document.createElement("div");
    row.className = "set-row";

    const indexEl = document.createElement("div");
    indexEl.className = "set-index";
    indexEl.textContent = idx + 1;
    row.appendChild(indexEl);

    const repsField = document.createElement("div");
    repsField.className = "set-field";
    const repsInput = document.createElement("input");
    repsInput.className = "set-input";
    repsInput.type = "number";
    repsInput.inputMode = "numeric";
    repsInput.min = "0";
    repsInput.placeholder = "0";
    repsInput.value = set.reps;
    repsInput.addEventListener("input", () => {
      set.reps = repsInput.value;
      persistSessions();
    });
    repsField.appendChild(repsInput);
    row.appendChild(repsField);

    const weightField = document.createElement("div");
    weightField.className = "weight-field";
    const weightInput = document.createElement("input");
    weightInput.className = "set-input";
    weightInput.type = "number";
    weightInput.inputMode = "decimal";
    weightInput.min = "0";
    weightInput.step = "0.5";
    weightInput.placeholder = "0";
    weightInput.value = set.weight;
    weightInput.disabled = set.bodyweight;
    weightInput.addEventListener("input", () => {
      set.weight = weightInput.value;
      persistSessions();
    });

    const bwToggle = document.createElement("button");
    bwToggle.type = "button";
    bwToggle.className = "bw-toggle" + (set.bodyweight ? " is-active" : "");
    bwToggle.textContent = "BW";
    bwToggle.setAttribute("aria-pressed", String(set.bodyweight));
    bwToggle.addEventListener("click", () => {
      set.bodyweight = !set.bodyweight;
      if (set.bodyweight) set.weight = "";
      persistSessions();
      renderToday();
    });

    weightField.appendChild(weightInput);
    weightField.appendChild(bwToggle);
    row.appendChild(weightField);

    const removeBtn = document.createElement("button");
    removeBtn.className = "set-remove";
    removeBtn.setAttribute("aria-label", "Remove set");
    removeBtn.innerHTML = "&times;";
    removeBtn.addEventListener("click", () => {
      if (entry.sets.length <= 1) {
        showToast("An exercise needs at least one set");
        return;
      }
      entry.sets = entry.sets.filter((s) => s.id !== set.id);
      persistSessions();
      renderToday();
    });
    row.appendChild(removeBtn);

    return row;
  }

  /* ---------------- history view ---------------- */

  const historyListEl = document.getElementById("history-list");
  const historyEmptyEl = document.getElementById("history-empty");

  function renderHistory() {
    const past = sessions.filter((s) => s.entries.length > 0);
    historyListEl.innerHTML = "";
    if (past.length === 0) {
      historyEmptyEl.classList.add("is-visible");
      return;
    }
    historyEmptyEl.classList.remove("is-visible");

    past.forEach((session) => {
      const item = document.createElement("div");
      item.className = "history-item";

      const head = document.createElement("button");
      head.className = "history-item-head";
      const totalSets = session.entries.reduce((sum, e) => sum + e.sets.length, 0);
      head.innerHTML = `
        <div>
          <div class="history-date"></div>
          <div class="history-meta"></div>
        </div>
        <span class="history-chevron">&#9656;</span>
      `;
      head.querySelector(".history-date").textContent = formatDateLabel(session.dateKey);
      head.querySelector(".history-meta").textContent = `${session.entries.length} exercise${session.entries.length === 1 ? "" : "s"} · ${totalSets} set${totalSets === 1 ? "" : "s"}`;
      head.addEventListener("click", () => item.classList.toggle("is-open"));
      item.appendChild(head);

      const body = document.createElement("div");
      body.className = "history-body";
      session.entries.forEach((entry) => {
        const e = document.createElement("div");
        e.className = "history-entry";
        const setsText = entry.sets
          .map((s) => `${s.reps || "0"} × ${s.bodyweight ? "BW" : (s.weight || "0") + "kg"}`)
          .join("  ·  ");
        e.innerHTML = `<div class="history-entry-name"></div><div class="history-sets"></div>`;
        e.querySelector(".history-entry-name").textContent = entry.name;
        e.querySelector(".history-sets").textContent = setsText;
        body.appendChild(e);
      });
      item.appendChild(body);

      historyListEl.appendChild(item);
    });
  }

  /* ---------------- exercise picker modal ---------------- */

  const pickerModal = document.getElementById("picker-modal");
  const pickerSearch = document.getElementById("picker-search");
  const pickerList = document.getElementById("picker-list");
  const muscleFiltersEl = document.getElementById("muscle-filters");

  let activeMuscleFilter = "All";

  function buildMuscleChips(container, { multi, onSelect, includeAll }) {
    container.innerHTML = "";
    const groups = includeAll ? ["All", ...MUSCLE_GROUPS] : MUSCLE_GROUPS;
    groups.forEach((group) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = group;
      chip.dataset.group = group;
      container.appendChild(chip);
      chip.addEventListener("click", () => onSelect(group, chip));
    });
  }

  function openPicker() {
    activeMuscleFilter = "All";
    pickerSearch.value = "";
    buildMuscleChips(muscleFiltersEl, {
      includeAll: true,
      onSelect: (group, chip) => {
        activeMuscleFilter = group;
        [...muscleFiltersEl.children].forEach((c) => c.classList.toggle("is-active", c === chip));
        renderPickerList();
      },
    });
    muscleFiltersEl.firstChild.classList.add("is-active");
    renderPickerList();
    pickerModal.classList.add("is-open");
    pickerModal.setAttribute("aria-hidden", "false");
  }

  function closePicker() {
    pickerModal.classList.remove("is-open");
    pickerModal.setAttribute("aria-hidden", "true");
  }

  function renderPickerList() {
    const query = pickerSearch.value.trim().toLowerCase();
    const items = allExercises().filter((ex) => {
      const matchesMuscle = activeMuscleFilter === "All" || ex.muscles.includes(activeMuscleFilter);
      const matchesQuery = !query || ex.name.toLowerCase().includes(query);
      return matchesMuscle && matchesQuery;
    });

    pickerList.innerHTML = "";
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "picker-empty";
      empty.textContent = "No exercises match. Try another filter or create a custom one.";
      pickerList.appendChild(empty);
      return;
    }

    items.forEach((ex) => {
      const btn = document.createElement("button");
      btn.className = "picker-item";
      btn.innerHTML = `
        <div>
          <div class="picker-item-name"></div>
          <div class="picker-item-muscles"></div>
        </div>
        <span class="picker-item-type"></span>
      `;
      btn.querySelector(".picker-item-name").textContent = ex.name;
      btn.querySelector(".picker-item-muscles").textContent = ex.muscles.join(" · ");
      btn.querySelector(".picker-item-type").textContent = ex.type === "dumbbell" ? "Dumbbell" : "Bodyweight";
      btn.addEventListener("click", () => addExerciseToToday(ex));
      pickerList.appendChild(btn);
    });
  }

  function addExerciseToToday(ex) {
    const session = getOrCreateTodaySession();
    session.entries.push({
      id: uid(),
      exerciseId: ex.id,
      name: ex.name,
      type: ex.type,
      muscles: ex.muscles,
      sets: [defaultSet(), defaultSet(), defaultSet()],
    });
    persistSessions();
    closePicker();
    renderToday();
    showToast(`Added ${ex.name}`);
  }

  pickerSearch.addEventListener("input", renderPickerList);
  document.getElementById("btn-add-exercise").addEventListener("click", openPicker);
  document.getElementById("picker-close").addEventListener("click", closePicker);
  pickerModal.addEventListener("click", (e) => { if (e.target === pickerModal) closePicker(); });

  /* ---------------- custom exercise modal ---------------- */

  const customModal = document.getElementById("custom-modal");
  const customName = document.getElementById("custom-name");
  const customTypeGroup = document.getElementById("custom-type");
  const customMuscleChips = document.getElementById("custom-muscle-chips");

  let customType = "dumbbell";
  let customSelectedMuscles = new Set();

  function openCustomModal() {
    customName.value = "";
    customType = "dumbbell";
    customSelectedMuscles = new Set();
    [...customTypeGroup.children].forEach((b) => b.classList.toggle("is-active", b.dataset.type === "dumbbell"));

    buildMuscleChips(customMuscleChips, {
      multi: true,
      includeAll: false,
      onSelect: (group, chip) => {
        if (customSelectedMuscles.has(group)) {
          customSelectedMuscles.delete(group);
          chip.classList.remove("is-active");
        } else {
          customSelectedMuscles.add(group);
          chip.classList.add("is-active");
        }
      },
    });

    customModal.classList.add("is-open");
    customModal.setAttribute("aria-hidden", "false");
    closePicker();
    setTimeout(() => customName.focus(), 50);
  }

  function closeCustomModal() {
    customModal.classList.remove("is-open");
    customModal.setAttribute("aria-hidden", "true");
  }

  customTypeGroup.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    customType = btn.dataset.type;
    [...customTypeGroup.children].forEach((b) => b.classList.toggle("is-active", b === btn));
  });

  document.getElementById("btn-new-custom").addEventListener("click", openCustomModal);
  document.getElementById("custom-close").addEventListener("click", closeCustomModal);
  customModal.addEventListener("click", (e) => { if (e.target === customModal) closeCustomModal(); });

  document.getElementById("btn-save-custom").addEventListener("click", () => {
    const name = customName.value.trim();
    if (!name) { showToast("Give the exercise a name"); customName.focus(); return; }
    if (customSelectedMuscles.size === 0) { showToast("Pick at least one muscle group"); return; }

    const ex = {
      id: "c-" + uid(),
      name,
      type: customType,
      muscles: [...customSelectedMuscles],
    };
    customExercises.push(ex);
    persistCustom();
    closeCustomModal();
    addExerciseToToday(ex);
  });

  /* ---------------- export / import ---------------- */

  document.getElementById("btn-export").addEventListener("click", () => {
    const payload = { exportedAt: new Date().toISOString(), sessions, customExercises };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iron-log-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const importInput = document.getElementById("import-file");
  document.getElementById("btn-import").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", () => {
    const file = importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.sessions)) throw new Error("Invalid backup file");
        sessions = data.sessions;
        customExercises = Array.isArray(data.customExercises) ? data.customExercises : [];
        persistSessions();
        persistCustom();
        renderToday();
        renderHistory();
        showToast("Backup imported");
      } catch (e) {
        showToast("Couldn't read that backup file");
      }
      importInput.value = "";
    };
    reader.readAsText(file);
  });

  /* ---------------- init ---------------- */

  renderToday();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((e) => console.warn("SW registration failed", e));
    });
  }
})();
