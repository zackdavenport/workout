(() => {
  "use strict";

  /* ---------------- storage ---------------- */

  // Legacy (pre-profiles) single-user keys — read once for migration, then left alone.
  const LEGACY_SESSIONS_KEY = "ironlog_sessions_v1";
  const LEGACY_CUSTOM_KEY = "ironlog_custom_exercises_v1";

  const PROFILES_KEY = "ironlog_profiles_v1";
  const ACTIVE_PROFILE_KEY = "ironlog_active_profile_v1";
  const sessionsKey = (profileId) => `ironlog_sessions_v2:${profileId}`;
  const customKey = (profileId) => `ironlog_custom_exercises_v1:${profileId}`;
  const templatesKey = (profileId) => `ironlog_templates_v1:${profileId}`;

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

  let profiles = load(PROFILES_KEY, []);   // [{id, name}]
  let activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY) || null;

  let sessions = [];         // sessions for the active profile only
  let customExercises = [];  // custom exercises for the active profile only
  let templates = [];        // saved workout templates for the active profile only

  const persistProfiles = () => save(PROFILES_KEY, profiles);
  const persistSessions = () => save(sessionsKey(activeProfileId), sessions);
  const persistCustom = () => save(customKey(activeProfileId), customExercises);
  const persistTemplates = () => save(templatesKey(activeProfileId), templates);

  function loadProfileData(profileId) {
    sessions = load(sessionsKey(profileId), []);
    customExercises = load(customKey(profileId), []);
    templates = load(templatesKey(profileId), []);
  }

  // One-time upgrade path: if this device has data from before multi-profile
  // support existed, fold it into a new "Me" profile instead of losing it.
  function migrateLegacyDataIfNeeded() {
    if (profiles.length > 0) return;

    const legacySessions = load(LEGACY_SESSIONS_KEY, null);
    const legacyCustom = load(LEGACY_CUSTOM_KEY, null);
    if (!legacySessions && !legacyCustom) return;

    const migratedProfile = { id: uid(), name: "Me" };
    const migratedSessions = (legacySessions || [])
      .filter((s) => s.entries && s.entries.length > 0)
      .map((s) => ({
        id: s.id || uid(),
        startedAt: `${s.dateKey}T12:00:00`,
        endedAt: `${s.dateKey}T12:00:00`,
        status: "completed",
        entries: s.entries,
      }));

    profiles = [migratedProfile];
    persistProfiles();
    save(sessionsKey(migratedProfile.id), migratedSessions);
    save(customKey(migratedProfile.id), legacyCustom || []);
    activeProfileId = migratedProfile.id;
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
    localStorage.removeItem(LEGACY_SESSIONS_KEY);
    localStorage.removeItem(LEGACY_CUSTOM_KEY);

    setTimeout(() => showToast("Your existing data was moved into a profile called \u201cMe\u201d"), 600);
  }

  /* ---------------- helpers ---------------- */

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const dateKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Label for the day a timestamp falls on: "Today", "Yesterday", or a full date.
  const formatDayLabel = (iso) => {
    const date = new Date(iso);
    const key = dateKeyOf(date);
    const todayK = dateKeyOf(new Date());
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    if (key === todayK) return "Today";
    if (key === dateKeyOf(yest)) return "Yesterday";
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const formatDuration = (startIso, endIso) => {
    const mins = Math.max(1, Math.round((new Date(endIso) - new Date(startIso)) / 60000));
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
  };

  const allExercises = () => [...BUILTIN_EXERCISES, ...customExercises];

  const findActiveSession = () => sessions.find((s) => s.status === "active");

  const getOrCreateActiveSession = () => {
    let s = findActiveSession();
    if (!s) {
      s = { id: uid(), startedAt: new Date().toISOString(), endedAt: null, status: "active", entries: [] };
      sessions.unshift(s);
      persistSessions();
    }
    return s;
  };

  const defaultSet = () => ({ id: uid(), reps: "", weight: "", bodyweight: false });

  const cloneSets = (sets) => sets.map((s) => ({ id: uid(), reps: s.reps, weight: s.weight, bodyweight: s.bodyweight }));

  // Looks through completed sessions (most recent first) for the last time this
  // exercise was logged, and returns a fresh copy of those sets. Falls back to
  // 3 blank sets if it's never been logged before.
  function mostRecentSetsForExercise(exerciseId) {
    const completed = sessions
      .filter((s) => s.status === "completed")
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    for (const s of completed) {
      const entry = s.entries.find((e) => e.exerciseId === exerciseId);
      if (entry) return cloneSets(entry.sets);
    }
    return [defaultSet(), defaultSet(), defaultSet()];
  }

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
  const views = {
    today: document.getElementById("view-today"),
    templates: document.getElementById("view-templates"),
    history: document.getElementById("view-history"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      Object.values(views).forEach((v) => v.classList.remove("is-active"));
      views[tab.dataset.view].classList.add("is-active");
      if (tab.dataset.view === "history") renderHistory();
      if (tab.dataset.view === "templates") renderTemplates();
    });
  });

  /* ---------------- today view rendering ---------------- */

  const todayDateLabelEl = document.getElementById("today-date-label");
  const todayEntriesEl = document.getElementById("today-entries");
  const todayEmptyEl = document.getElementById("today-empty");
  const endWorkoutBtn = document.getElementById("btn-end-workout");
  const todayTemplateActionsEl = document.getElementById("today-template-actions");

  function renderToday() {
    const session = findActiveSession();

    if (!session) {
      todayDateLabelEl.textContent = "No active workout";
      endWorkoutBtn.classList.add("is-hidden");
      todayEntriesEl.innerHTML = "";
      todayEmptyEl.classList.add("is-visible");
      todayTemplateActionsEl.classList.remove("is-visible");
      return;
    }

    todayDateLabelEl.textContent = `${formatDayLabel(session.startedAt)} \u00b7 In progress since ${formatTime(session.startedAt)}`;
    endWorkoutBtn.classList.remove("is-hidden");

    todayEntriesEl.innerHTML = "";
    if (session.entries.length === 0) {
      todayEmptyEl.classList.add("is-visible");
      todayTemplateActionsEl.classList.remove("is-visible");
    } else {
      todayEmptyEl.classList.remove("is-visible");
      todayTemplateActionsEl.classList.add("is-visible");
      session.entries.forEach((entry) => todayEntriesEl.appendChild(renderEntryCard(session, entry)));
    }
  }

  document.getElementById("btn-save-template").addEventListener("click", () => {
    const session = findActiveSession();
    if (session) saveSessionAsTemplate(session);
  });

  endWorkoutBtn.addEventListener("click", () => {
    const session = findActiveSession();
    if (!session) return;

    if (session.entries.length === 0) {
      if (confirm("This workout has no exercises logged yet. Discard it?")) {
        sessions = sessions.filter((s) => s.id !== session.id);
        persistSessions();
        renderToday();
      }
      return;
    }

    if (!confirm("End this workout and save it to your history?")) return;

    session.status = "completed";
    session.endedAt = new Date().toISOString();
    persistSessions();
    renderToday();
    showToast("Workout logged");
  });

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
    const past = sessions
      .filter((s) => s.status === "completed" && s.entries.length > 0)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
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
      const durationText = session.endedAt ? ` · ${formatDuration(session.startedAt, session.endedAt)}` : "";
      head.querySelector(".history-date").textContent = `${formatDayLabel(session.startedAt)} \u00b7 ${formatTime(session.startedAt)}`;
      head.querySelector(".history-meta").textContent = `${session.entries.length} exercise${session.entries.length === 1 ? "" : "s"} · ${totalSets} set${totalSets === 1 ? "" : "s"}${durationText}`;
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

      const saveTplBtn = document.createElement("button");
      saveTplBtn.className = "link-btn";
      saveTplBtn.style.marginTop = "10px";
      saveTplBtn.textContent = "Save as template";
      saveTplBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        saveSessionAsTemplate(session);
      });
      body.appendChild(saveTplBtn);

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
    const session = getOrCreateActiveSession();
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

  /* ---------------- templates ---------------- */

  const templatesListEl = document.getElementById("templates-list");
  const templatesEmptyEl = document.getElementById("templates-empty");

  function renderTemplates() {
    templatesListEl.innerHTML = "";
    if (templates.length === 0) {
      templatesEmptyEl.classList.add("is-visible");
      return;
    }
    templatesEmptyEl.classList.remove("is-visible");

    templates.forEach((tpl) => {
      const card = document.createElement("div");
      card.className = "template-card";

      const head = document.createElement("div");
      head.className = "template-card-head";
      head.innerHTML = `
        <div>
          <div class="template-name"></div>
          <div class="template-sub"></div>
        </div>
      `;
      head.querySelector(".template-name").textContent = tpl.name;
      head.querySelector(".template-sub").textContent = `${tpl.exercises.length} exercise${tpl.exercises.length === 1 ? "" : "s"}`;
      card.appendChild(head);

      const list = document.createElement("div");
      list.className = "template-exercise-list";
      list.textContent = tpl.exercises.map((e) => e.name).join(" · ");
      card.appendChild(list);

      const actions = document.createElement("div");
      actions.className = "template-card-actions";

      const startBtn = document.createElement("button");
      startBtn.className = "template-start-btn";
      startBtn.textContent = "Start workout";
      startBtn.addEventListener("click", () => startWorkoutFromTemplate(tpl));
      actions.appendChild(startBtn);

      const editBtn = document.createElement("button");
      editBtn.className = "icon-btn-sm";
      editBtn.setAttribute("aria-label", `Edit ${tpl.name}`);
      editBtn.textContent = "\u270E";
      editBtn.addEventListener("click", () => openTemplateBuilder(tpl));
      actions.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn-sm";
      deleteBtn.setAttribute("aria-label", `Delete ${tpl.name}`);
      deleteBtn.textContent = "\u2715";
      deleteBtn.addEventListener("click", () => {
        if (!confirm(`Delete the "${tpl.name}" template? This won't affect any workouts you've already logged.`)) return;
        templates = templates.filter((t) => t.id !== tpl.id);
        persistTemplates();
        renderTemplates();
      });
      actions.appendChild(deleteBtn);

      card.appendChild(actions);
      templatesListEl.appendChild(card);
    });
  }

  // Save the exercises from a session (active or completed) as a reusable template.
  function saveSessionAsTemplate(session) {
    if (session.entries.length === 0) {
      showToast("Add some exercises first");
      return;
    }
    const name = prompt("Name this template (e.g. \u201cArm Day\u201d)");
    if (!name || !name.trim()) return;

    const seen = new Set();
    const exercises = [];
    session.entries.forEach((e) => {
      if (seen.has(e.exerciseId)) return;
      seen.add(e.exerciseId);
      exercises.push({ exerciseId: e.exerciseId, name: e.name, type: e.type, muscles: e.muscles });
    });

    templates.push({ id: uid(), name: name.trim(), exercises });
    persistTemplates();
    showToast(`Saved "${name.trim()}" as a template`);
  }

  // Adds every exercise from a template into the active session (creating one if
  // needed), pre-filled with each exercise's most recently logged sets/reps/weight.
  function startWorkoutFromTemplate(tpl) {
    const session = getOrCreateActiveSession();
    let addedCount = 0;

    tpl.exercises.forEach((exSnap) => {
      const alreadyInSession = session.entries.some((e) => e.exerciseId === exSnap.exerciseId);
      if (alreadyInSession) return;
      session.entries.push({
        id: uid(),
        exerciseId: exSnap.exerciseId,
        name: exSnap.name,
        type: exSnap.type,
        muscles: exSnap.muscles,
        sets: mostRecentSetsForExercise(exSnap.exerciseId),
      });
      addedCount++;
    });

    persistSessions();
    document.querySelector('.tab[data-view="today"]').click();
    renderToday();
    showToast(addedCount > 0 ? `Loaded "${tpl.name}"` : `${tpl.name}'s exercises are already in today's workout`);
  }

  /* ---------------- template builder modal ---------------- */

  const templateModal = document.getElementById("template-modal");
  const templateModalTitle = document.getElementById("template-modal-title");
  const templateNameInput = document.getElementById("template-name");
  const templatePickerSearch = document.getElementById("template-picker-search");
  const templatePickerList = document.getElementById("template-picker-list");
  const templateMuscleFiltersEl = document.getElementById("template-muscle-filters");

  let editingTemplateId = null;
  let templateActiveMuscleFilter = "All";
  let templateSelectedExerciseIds = new Set();

  function openTemplateBuilder(existingTpl) {
    editingTemplateId = existingTpl ? existingTpl.id : null;
    templateModalTitle.textContent = existingTpl ? "Edit template" : "New template";
    templateNameInput.value = existingTpl ? existingTpl.name : "";
    templateSelectedExerciseIds = new Set(existingTpl ? existingTpl.exercises.map((e) => e.exerciseId) : []);
    templateActiveMuscleFilter = "All";
    templatePickerSearch.value = "";

    buildMuscleChips(templateMuscleFiltersEl, {
      includeAll: true,
      onSelect: (group, chip) => {
        templateActiveMuscleFilter = group;
        [...templateMuscleFiltersEl.children].forEach((c) => c.classList.toggle("is-active", c === chip));
        renderTemplatePickerList();
      },
    });
    templateMuscleFiltersEl.firstChild.classList.add("is-active");

    renderTemplatePickerList();
    templateModal.classList.add("is-open");
    templateModal.setAttribute("aria-hidden", "false");
  }

  function closeTemplateBuilder() {
    templateModal.classList.remove("is-open");
    templateModal.setAttribute("aria-hidden", "true");
  }

  function renderTemplatePickerList() {
    const query = templatePickerSearch.value.trim().toLowerCase();
    const items = allExercises().filter((ex) => {
      const matchesMuscle = templateActiveMuscleFilter === "All" || ex.muscles.includes(templateActiveMuscleFilter);
      const matchesQuery = !query || ex.name.toLowerCase().includes(query);
      return matchesMuscle && matchesQuery;
    });

    templatePickerList.innerHTML = "";
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "picker-empty";
      empty.textContent = "No exercises match that filter.";
      templatePickerList.appendChild(empty);
      return;
    }

    items.forEach((ex) => {
      const btn = document.createElement("button");
      const isSelected = templateSelectedExerciseIds.has(ex.id);
      btn.className = "picker-item" + (isSelected ? " is-selected" : "");
      btn.innerHTML = `
        <span class="picker-item-check">\u2713</span>
        <div style="flex:1;">
          <div class="picker-item-name"></div>
          <div class="picker-item-muscles"></div>
        </div>
      `;
      btn.querySelector(".picker-item-name").textContent = ex.name;
      btn.querySelector(".picker-item-muscles").textContent = ex.muscles.join(" · ");
      btn.addEventListener("click", () => {
        if (templateSelectedExerciseIds.has(ex.id)) {
          templateSelectedExerciseIds.delete(ex.id);
        } else {
          templateSelectedExerciseIds.add(ex.id);
        }
        renderTemplatePickerList();
      });
      templatePickerList.appendChild(btn);
    });
  }

  templatePickerSearch.addEventListener("input", renderTemplatePickerList);
  document.getElementById("btn-new-template").addEventListener("click", () => openTemplateBuilder(null));
  document.getElementById("template-close").addEventListener("click", closeTemplateBuilder);
  templateModal.addEventListener("click", (e) => { if (e.target === templateModal) closeTemplateBuilder(); });

  document.getElementById("btn-save-template-def").addEventListener("click", () => {
    const name = templateNameInput.value.trim();
    if (!name) { showToast("Give the template a name"); templateNameInput.focus(); return; }
    if (templateSelectedExerciseIds.size === 0) { showToast("Pick at least one exercise"); return; }

    const exercises = allExercises()
      .filter((ex) => templateSelectedExerciseIds.has(ex.id))
      .map((ex) => ({ exerciseId: ex.id, name: ex.name, type: ex.type, muscles: ex.muscles }));

    if (editingTemplateId) {
      const tpl = templates.find((t) => t.id === editingTemplateId);
      tpl.name = name;
      tpl.exercises = exercises;
    } else {
      templates.push({ id: uid(), name, exercises });
    }
    persistTemplates();
    closeTemplateBuilder();
    renderTemplates();
    showToast(`Saved "${name}"`);
  });

  /* ---------------- profiles ---------------- */

  const profileModal = document.getElementById("profile-modal");
  const profileModalTitle = document.getElementById("profile-modal-title");
  const profileModalSub = document.getElementById("profile-modal-sub");
  const profileCloseBtn = document.getElementById("profile-close");
  const profileListEl = document.getElementById("profile-list");
  const newProfileNameInput = document.getElementById("new-profile-name");
  const profileBadgeEl = document.getElementById("profile-initial");
  const profileNameLabelEl = document.getElementById("profile-name-label");

  function currentProfile() {
    return profiles.find((p) => p.id === activeProfileId) || null;
  }

  function refreshProfileBadge() {
    const p = currentProfile();
    if (!p) return;
    profileBadgeEl.textContent = p.name.trim().charAt(0).toUpperCase() || "?";
    profileNameLabelEl.textContent = p.name;
  }

  function switchToProfile(profileId) {
    activeProfileId = profileId;
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
    loadProfileData(activeProfileId);
    refreshProfileBadge();
    renderToday();
    renderHistory();
  }

  function openProfileModal(forced) {
    const isOnboarding = forced || profiles.length === 0;
    profileModalTitle.textContent = isOnboarding ? "Who's training?" : "Switch profile";
    profileModalSub.textContent = isOnboarding
      ? "Each person's sets and history stay private to their own profile, saved only on this device."
      : "Data for each profile stays on this device and is kept separate.";
    profileCloseBtn.style.visibility = (isOnboarding && profiles.length === 0) ? "hidden" : "visible";

    renderProfileList();
    newProfileNameInput.value = "";
    profileModal.classList.add("is-open");
    profileModal.setAttribute("aria-hidden", "false");
    if (profiles.length === 0) setTimeout(() => newProfileNameInput.focus(), 50);
  }

  function closeProfileModal() {
    if (profiles.length === 0) return; // must create at least one profile to proceed
    profileModal.classList.remove("is-open");
    profileModal.setAttribute("aria-hidden", "true");
  }

  function renderProfileList() {
    profileListEl.innerHTML = "";
    profiles.forEach((p) => {
      const row = document.createElement("div");
      row.className = "profile-row" + (p.id === activeProfileId ? " is-active" : "");

      const nameBtn = document.createElement("button");
      nameBtn.className = "profile-row-name";
      nameBtn.textContent = p.name;
      nameBtn.addEventListener("click", () => {
        switchToProfile(p.id);
        closeProfileModal();
        showToast(`Switched to ${p.name}`);
      });
      row.appendChild(nameBtn);

      if (p.id === activeProfileId) {
        const tag = document.createElement("span");
        tag.className = "profile-row-active-tag";
        tag.textContent = "Active";
        row.appendChild(tag);
      }

      const actions = document.createElement("div");
      actions.className = "profile-row-actions";

      const renameBtn = document.createElement("button");
      renameBtn.className = "icon-btn-sm";
      renameBtn.setAttribute("aria-label", `Rename ${p.name}`);
      renameBtn.textContent = "\u270E";
      renameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const next = prompt("Rename profile", p.name);
        if (next && next.trim()) {
          p.name = next.trim();
          persistProfiles();
          refreshProfileBadge();
          renderProfileList();
        }
      });
      actions.appendChild(renameBtn);

      if (profiles.length > 1) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "icon-btn-sm";
        deleteBtn.setAttribute("aria-label", `Delete ${p.name}`);
        deleteBtn.textContent = "\u2715";
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!confirm(`Delete "${p.name}" and all of their workout data? This can't be undone.`)) return;
          localStorage.removeItem(sessionsKey(p.id));
          localStorage.removeItem(customKey(p.id));
          profiles = profiles.filter((x) => x.id !== p.id);
          persistProfiles();
          if (activeProfileId === p.id) {
            switchToProfile(profiles[0].id);
          }
          renderProfileList();
        });
        actions.appendChild(deleteBtn);
      }

      row.appendChild(actions);
      profileListEl.appendChild(row);
    });
  }

  function addProfile() {
    const name = newProfileNameInput.value.trim();
    if (!name) { showToast("Enter a name first"); newProfileNameInput.focus(); return; }

    const p = { id: uid(), name };
    profiles.push(p);
    persistProfiles();
    save(sessionsKey(p.id), []);
    save(customKey(p.id), []);
    newProfileNameInput.value = "";

    const wasOnboarding = profiles.length === 1;
    switchToProfile(p.id);
    renderProfileList();
    if (wasOnboarding) {
      closeProfileModal();
      showToast(`Welcome, ${name}`);
    } else {
      showToast(`Added ${name}`);
    }
  }

  document.getElementById("btn-profile").addEventListener("click", () => openProfileModal(false));
  profileCloseBtn.addEventListener("click", closeProfileModal);
  profileModal.addEventListener("click", (e) => { if (e.target === profileModal) closeProfileModal(); });
  document.getElementById("btn-add-profile").addEventListener("click", addProfile);
  newProfileNameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addProfile(); });

  /* ---------------- export / import ---------------- */

  document.getElementById("btn-export").addEventListener("click", () => {
    const profileName = (profiles.find((p) => p.id === activeProfileId) || {}).name || "profile";
    const payload = { exportedAt: new Date().toISOString(), profileName, sessions, customExercises };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = profileName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "profile";
    a.download = `iron-log-backup-${safeName}-${dateKeyOf(new Date())}.json`;
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

  migrateLegacyDataIfNeeded();

  if (!activeProfileId || !profiles.some((p) => p.id === activeProfileId)) {
    activeProfileId = profiles.length > 0 ? profiles[0].id : null;
    if (activeProfileId) localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  }

  if (activeProfileId) loadProfileData(activeProfileId);

  if (profiles.length === 0) {
    openProfileModal(true);
  } else {
    refreshProfileBadge();
  }

  renderToday();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((e) => console.warn("SW registration failed", e));
    });

    // When a new service worker takes over (i.e. you've pushed an update),
    // reload once so the page picks up the new code instead of running stale JS.
    let hasReloadedForUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasReloadedForUpdate) return;
      hasReloadedForUpdate = true;
      window.location.reload();
    });
  }
})();
