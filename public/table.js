const controls = {
  cafeteria: document.getElementById("cafeteria"),
  selectedDate: document.getElementById("selectedDate"),
  saveBtn: document.getElementById("saveBtn"),
  jwtToken: document.getElementById("jwtToken"),
  prevWeekBtn: document.getElementById("prevWeekBtn"),
  nextWeekBtn: document.getElementById("nextWeekBtn"),
  status: document.getElementById("status"),
  headerRow: document.getElementById("headerRow"),
  tbody: document.getElementById("tbody"),
};

const state = {
  cafeteria: "haksik",
  date: today(),
  pending: new Map(),
  newPending: new Map(),
  mealsByDate: new Map(),
};

const JWT_STORAGE_KEY = "mealTable.jwtToken";
const CAFETERIA_STORAGE_KEY = "mealTable.cafeteria";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const CAFETERIA_OPTIONS = new Set(["haksik", "dodam", "faculty", "dormitory"]);

controls.cafeteria.value = state.cafeteria;
controls.selectedDate.value = state.date;
const cachedJwtToken = localStorage.getItem(JWT_STORAGE_KEY);
if (cachedJwtToken && controls.jwtToken) {
  controls.jwtToken.value = cachedJwtToken;
}
const cachedCafeteria = localStorage.getItem(CAFETERIA_STORAGE_KEY);
if (cachedCafeteria && CAFETERIA_OPTIONS.has(cachedCafeteria)) {
  controls.cafeteria.value = cachedCafeteria;
  state.cafeteria = cachedCafeteria;
}

controls.cafeteria.addEventListener("change", () => {
  state.cafeteria = controls.cafeteria.value;
  localStorage.setItem(CAFETERIA_STORAGE_KEY, state.cafeteria);
  fetchAndRender();
});

controls.selectedDate.addEventListener("change", () => {
  state.date = controls.selectedDate.value;
  fetchAndRender();
});

controls.prevWeekBtn?.addEventListener("click", () => {
  moveWeek(-7);
});

controls.nextWeekBtn?.addEventListener("click", () => {
  moveWeek(7);
});

controls.saveBtn.addEventListener("click", () => {
  void savePending();
});

controls.jwtToken?.addEventListener("input", () => {
  localStorage.setItem(JWT_STORAGE_KEY, controls.jwtToken?.value?.trim() || "");
});

const NEW_ROW_KEY = "__new_row__";
const MEAL_TYPE_LABELS = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
};

function formatMealType(mealType) {
  return MEAL_TYPE_LABELS[mealType] || mealType;
}

function today() {
  const now = new Date();
  return now.toLocaleDateString("en-CA");
}

function formatDateText(dateText) {
  const d = new Date(`${dateText}T00:00:00`);
  const day = weekdays[d.getDay()];
  return `${dateText} (${day})`;
}

function toYmd(date) {
  return new Date(date).toLocaleDateString("en-CA");
}

function getWeekRange(baseDate) {
  const base = new Date(`${baseDate}T00:00:00`);
  const day = base.getDay();
  const startOffset = (day + 6) % 7;
  const start = new Date(base);
  start.setDate(base.getDate() - startOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return toYmd(d);
  });
}

function moveWeek(days) {
  const base = new Date(`${state.date}T00:00:00`);
  base.setDate(base.getDate() + days);
  state.date = toYmd(base);
  controls.selectedDate.value = state.date;
  fetchAndRender();
}

function normalizeMenuText(value) {
  return String(value || "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function buildHeader(weekDates) {
  controls.headerRow.innerHTML =
    '<th class="col-name"></th>' +
    weekDates
      .map(
        (dateText) => `<th class="day-header" data-day-date="${dateText}">
          <div class="day-header-inner">
            <span>${formatDateText(dateText)}</span>
            <button class="scrape-day-btn" type="button" title="${dateText} 스크랩" aria-label="${dateText} 스크랩" data-scrape-date="${dateText}">↻</button>
          </div>
        </th>`
      )
      .join("");
}

function renderRow(row, weekDates) {
  const cells = weekDates.map((dateText, idx) => {
    const meals = row.mealsByDay.get(idx) || [];
    const html = meals
      .map((meal) => {
        const menuText = Array.isArray(meal.menu) ? meal.menu.join("\n") : "";
        const original = JSON.stringify(Array.isArray(meal.menu) ? meal.menu : []);
        return `<div class="meal-card">
          <textarea data-meal-id="${meal.id}" data-origin="${escapeHtml(original)}">${escapeHtml(menuText)}</textarea>
        </div>`;
      })
      .join("");
    if (html) {
      return `<td><div class="cell">${html}</div></td>`;
    }

    return `<td><div class="cell"><textarea data-kind="create" data-row-key="${row.rowKey}" data-meal-type="${row.mealType}" data-date="${dateText}" placeholder="메뉴 입력"></textarea></div></td>`;
  });

  if (row.isCreateRow) {
    return `<tr data-row-kind="create" data-row-key="${row.rowKey}">
      <td class="row-title">
        <div class="row-title-control">
          <input class="create-name-input" data-create-name type="text" placeholder="name" value="${escapeHtml(row.name)}" />
          <select class="create-meta-select" data-create-meal-type>
            <option value="breakfast" ${row.mealType === "breakfast" ? "selected" : ""}>아침</option>
            <option value="lunch" ${row.mealType === "lunch" ? "selected" : ""}>점심</option>
            <option value="dinner" ${row.mealType === "dinner" ? "selected" : ""}>저녁</option>
          </select>
        </div>
      </td>
      ${cells.join("")}
    </tr>`;
  }

  return `<tr data-row-key="${row.rowKey}" data-row-name="${escapeHtml(row.rawName || "")}">
    <td class="row-title" data-row-name="${escapeHtml(row.rawName || "")}">
      ${row.name}
    </td>
    ${cells.join("")}
  </tr>`;
}

function mergeRows(meals, weekDates) {
  const map = new Map();
  for (const meal of meals) {
    const key = `${meal.mealType}|${meal.name}`;
    const dateText = String(meal.date || "").slice(0, 10);
    const dayIndex = weekDates.indexOf(dateText);
    if (dayIndex < 0) continue;

    if (!map.has(key)) {
      map.set(key, {
        rowKey: key,
        rawName: meal.name,
        name: `${meal.name} (${formatMealType(meal.mealType)})`,
        mealType: meal.mealType,
        mealsByDay: new Map(),
      });
    }
    const row = map.get(key);
    const current = row.mealsByDay.get(dayIndex) || [];
    current.push(meal);
    row.mealsByDay.set(dayIndex, current);
  }
  const rows = Array.from(map.values());
  const isCreateRowExist = rows.some((row) => row.rowKey === NEW_ROW_KEY);
  if (!isCreateRowExist) {
    rows.push({
      rowKey: NEW_ROW_KEY,
      isCreateRow: true,
      name: "",
      rawName: "",
      mealType: "breakfast",
      mealsByDay: new Map(),
    });
  }
  return rows;
}

async function fetchMeals() {
  const weekDates = getWeekRange(state.date);
  const query = new URLSearchParams({
    cafeteria: state.cafeteria,
    startDate: weekDates[0],
    endDate: weekDates[6],
  });
  const response = await fetch(`/api/meals?${query.toString()}`);
  if (!response.ok) {
    throw new Error("조회 실패");
  }
  return response.json();
}

async function fetchAndRender() {
  state.pending.clear();
  state.newPending.clear();
  setStatus("조회 중...", "ok");
  controls.saveBtn.disabled = true;
  controls.tbody.innerHTML = "";
  try {
    const weekDates = getWeekRange(state.date);
    buildHeader(weekDates);
    const meals = await fetchMeals();
    state.mealsByDate = buildMealsDatePresence(meals);
    const rows = mergeRows(meals, weekDates);

    controls.tbody.innerHTML = rows.map((row) => renderRow(row, weekDates)).join("");
    controls.tbody.querySelectorAll("textarea").forEach((textarea) => {
      autoResizeTextarea(textarea);
      textarea.addEventListener("input", () => onMenuEdited(textarea));
    });
    controls.tbody.querySelectorAll("[data-create-name]").forEach((input) => {
      input.addEventListener("input", () => onCreateMetaChanged(input));
    });
    controls.tbody.querySelectorAll("[data-create-meal-type]").forEach((select) => {
      select.addEventListener("change", () => onCreateMetaChanged(select));
    });
    controls.headerRow.querySelectorAll(".scrape-day-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const dateText = button.dataset.scrapeDate;
        if (dateText) {
          void scrapeMealsForDate(dateText, button);
        }
      });
    });

    setStatus("조회 완료", "ok");
    refreshSaveState();
  } catch (error) {
    setStatus(error?.message || "조회 중 오류", "error");
  }
}

function buildMealsDatePresence(meals) {
  const presence = new Map();
  for (const meal of meals || []) {
    const dateText = String(meal?.date || "").slice(0, 10);
    if (!dateText) continue;
    presence.set(dateText, (presence.get(dateText) || 0) + 1);
  }
  return presence;
}

async function scrapeMealsForDate(dateText, buttonElement) {
  const jwtToken = controls.jwtToken?.value?.trim() || "";
  if (!jwtToken) {
    setStatus("JWT 토큰을 입력해 주세요.", "error");
    return;
  }

  const exists = state.mealsByDate.get(dateText) > 0;
  if (exists) {
    const ok = window.confirm(
      `${dateText}에 기존 데이터가 있습니다.\n덮어써서 갱신할까요?`
    );
    if (!ok) {
      return;
    }
  }

  if (buttonElement) {
    buttonElement.disabled = true;
  }
  setStatus(`${dateText} 스크랩 중...`, "ok");

  try {
    const response = await fetch("/api/scrape-meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        cafeteria: state.cafeteria,
        date: dateText,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const message =
        errorJson.message || `스크랩 실패 (${response.status})`;
      throw new Error(message);
    }

    setStatus(`${dateText} 스크랩 완료`, "ok");
    await fetchAndRender();
  } catch (error) {
    setStatus(error?.message || "스크랩 실패", "error");
  } finally {
    if (buttonElement) {
      buttonElement.disabled = false;
    }
  }
}

function onMenuEdited(textarea) {
  autoResizeTextarea(textarea);
  const mealId = textarea.dataset.mealId;
  const current = normalizeMenuText(textarea.value);
  if (mealId) {
    const original = parseOriginal(textarea.dataset.origin || "[]");
    if (JSON.stringify(current) === JSON.stringify(original)) {
      state.pending.delete(mealId);
    } else {
      state.pending.set(mealId, { menu: current });
    }
    refreshSaveState();
    return;
  }

  const rowKey = textarea.dataset.rowKey || "";
  const date = textarea.dataset.date || "";
  if (!rowKey || !date) return;

  const rowEl = textarea.closest("tr[data-row-key]");
  const rowNameInput = rowEl?.querySelector("[data-create-name]");
  const mealTypeSelect = rowEl?.querySelector("[data-create-meal-type]");
  const rowNameCell = rowEl?.querySelector("td[data-row-name]");
  const name = rowNameInput
    ? rowNameInput.value.trim()
    : String(rowNameCell?.dataset.rowName || "").trim();
  const mealType = mealTypeSelect ? mealTypeSelect.value : textarea.dataset.mealType || "";

  if (!current.length) {
    state.newPending.delete(`${rowKey}|${date}`);
    refreshSaveState();
    return;
  }

  state.newPending.set(`${rowKey}|${date}`, {
    rowKey,
    date,
    name,
    mealType,
    menu: current,
  });

  refreshSaveState();
}

async function savePending() {
  if (!state.pending.size && !state.newPending.size) return;
  const nextPatch = new Map(state.pending);
  const nextCreate = new Map(state.newPending);
  setStatus("저장 중...", "ok");
  controls.saveBtn.disabled = true;
  try {
    const jwtToken = controls.jwtToken?.value?.trim() || "";
    if (!jwtToken) {
      throw new Error("JWT 토큰을 입력해 주세요.");
    }

    for (const payload of nextCreate.values()) {
      if (!payload.name) {
        throw new Error("새 항목의 name을 입력해 주세요.");
      }
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    };

    for (const [mealId, payload] of nextPatch) {
      if (Array.isArray(payload.menu) && payload.menu.length === 0) {
        const response = await fetch(`/api/meals/${mealId}`, {
          method: "DELETE",
          headers,
        });
        if (!response.ok) {
          const errorJson = await response.json().catch(() => ({}));
          throw new Error(errorJson.message || "삭제 실패");
        }
        state.pending.delete(mealId);
        continue;
      }

      const response = await fetch(`/api/meals/${mealId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || "저장 실패");
      }
      state.pending.delete(mealId);
    }

    for (const [key, payload] of nextCreate) {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers,
        body: JSON.stringify({
          cafeteriaType: state.cafeteria,
          mealType: payload.mealType,
          name: payload.name,
          menu: payload.menu,
          date: payload.date,
        }),
      });
      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || "추가 실패");
      }
      state.newPending.delete(key);
    }

    setStatus("저장 완료", "ok");
    await fetchAndRender();
  } catch (error) {
    setStatus(error?.message || "저장 실패", "error");
    controls.saveBtn.disabled = false;
  }
}

function onCreateMetaChanged(input) {
  const rowEl = input.closest("tr[data-row-key]");
  const rowKey = rowEl?.dataset.rowKey;
  if (!rowKey) return;

  const nameInput = rowEl.querySelector("[data-create-name]");
  const mealTypeSelect = rowEl.querySelector("[data-create-meal-type]");
  const nextName = nameInput ? nameInput.value.trim() : "";
  const nextMealType = mealTypeSelect ? mealTypeSelect.value : "";

  for (const [key, payload] of Array.from(state.newPending.entries())) {
    if (payload.rowKey !== rowKey) continue;
    payload.name = nextName;
    payload.mealType = nextMealType;
    state.newPending.set(key, payload);
  }

  refreshSaveState();
}

function refreshSaveState() {
  controls.saveBtn.disabled = state.pending.size === 0 && state.newPending.size === 0;
}

function autoResizeTextarea(textarea) {
  textarea.style.height = "0px";
  const nextHeight = Math.max(86, textarea.scrollHeight);
  textarea.style.height = `${nextHeight}px`;
}

function parseOriginal(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStatus(message, tone) {
  controls.status.textContent = message;
  controls.status.className = `status ${tone || "ok"}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

fetchAndRender();
