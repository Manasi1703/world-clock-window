const cityData = [
  {
    id: "mumbai",
    city: "Mumbai",
    zone: "Asia/Kolkata",
    offsetLabel: "+9:30",
    images: {
      morning: "assets/mumbai-morning.png",
      day: "assets/mumbai-day.png",
      evening: "assets/mumbai-evening.png",
      night: "assets/mumbai-night.png",
    },
    landmark: "Gateway of India",
  },
  {
    id: "indianapolis",
    city: "Indianapolis",
    zone: "America/Indiana/Indianapolis",
    offsetLabel: "+0HRS",
    images: {
      morning: "assets/indianapolis-morning.png",
      day: "assets/indianapolis-day.png",
      evening: "assets/indianapolis-evening.png",
      night: "assets/indianapolis-night.png",
    },
    landmark: "Monument Circle",
  },
  {
    id: "new-york",
    city: "New York",
    zone: "America/New_York",
    offsetLabel: "+0HRS",
    images: {
      morning: "assets/new-york-morning.png",
      day: "assets/new-york-day.png",
      evening: "assets/new-york-evening.png",
      night: "assets/new-york-night.png",
    },
    landmark: "Statue of Liberty",
  },
  {
    id: "paris",
    city: "Paris",
    zone: "Europe/Paris",
    offsetLabel: "+6HRS",
    images: {
      morning: "assets/paris-morning.png",
      day: "assets/paris-day.png",
      evening: "assets/paris-evening.png",
      night: "assets/paris-night.png",
    },
    landmark: "Eiffel Tower",
  },
];

const state = {
  gridMode: false,
  openWindows: new Set(),
  visibleCities: new Set(cityData.map((city) => city.id)),
};

cityData
  .flatMap((city) => Object.values(city.images))
  .forEach((src) => {
    const image = new Image();
    image.src = src;
  });

const app = document.querySelector(".clock-app");
const localStatusTime = document.querySelector("#localStatusTime");
const clockList = document.querySelector("#clockList");
const windowGrid = document.querySelector("#windowGrid");
const windowModeBtn = document.querySelector("#windowModeBtn");
const addBtn = document.querySelector("#addBtn");
const addSheet = document.querySelector("#addSheet");
const closeSheet = document.querySelector("#closeSheet");
const cityChoices = document.querySelector("#cityChoices");
function getParts(date, zone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getTime(date, zone) {
  const parts = getParts(date, zone);
  return {
    main: `${parts.hour}:${parts.minute}`,
    period: parts.dayPeriod,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour24: getHour24(date, zone),
  };
}

function getHour24(date, zone) {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .find((part) => part.type === "hour");

  return Number(hourPart?.value ?? 0);
}

function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 11) {
    return { id: "morning", label: "Morning" };
  }

  if (hour >= 11 && hour < 17) {
    return { id: "day", label: "Day" };
  }

  if (hour >= 17 && hour < 20) {
    return { id: "evening", label: "Evening" };
  }

  return { id: "night", label: "Night" };
}

function getDateWord(cityTime, localTime) {
  if (cityTime.dateKey === localTime.dateKey) {
    return "Today";
  }

  const localDate = new Date(...localTime.dateKey.split("-").map((part, index) => {
    const value = Number(part);
    return index === 1 ? value - 1 : value;
  }));
  const cityDate = new Date(...cityTime.dateKey.split("-").map((part, index) => {
    const value = Number(part);
    return index === 1 ? value - 1 : value;
  }));

  return cityDate > localDate ? "Tomorrow" : "Yesterday";
}

function getVisibleCities() {
  return cityData.filter((city) => state.visibleCities.has(city.id));
}

function renderList(now) {
  const localTime = getTime(now, "America/Indiana/Indianapolis");
  clockList.innerHTML = "";

  getVisibleCities().forEach((city) => {
    const cityTime = getTime(now, city.zone);
    const row = document.createElement("article");
    row.className = "city-row";
    row.innerHTML = `
      <div class="city-meta">
        <span class="date-offset">${getDateWord(cityTime, localTime)}, ${city.offsetLabel}</span>
        <span class="city-name">${city.city}</span>
      </div>
      <time class="city-time" datetime="${cityTime.main} ${cityTime.period}">
        <span class="time-main">${cityTime.main}</span>
        <span class="time-period">${cityTime.period}</span>
      </time>
    `;
    clockList.append(row);
  });
}

function renderGrid(now) {
  const localTime = getTime(now, "America/Indiana/Indianapolis");
  windowGrid.innerHTML = "";

  getVisibleCities().forEach((city) => {
    const cityTime = getTime(now, city.zone);
    const timeOfDay = getTimeOfDay(cityTime.hour24);
    const isOpen = state.openWindows.has(city.id);
    const card = document.createElement("article");
    card.className = `window-card time-${timeOfDay.id}${isOpen ? " open" : ""}`;
    card.style.setProperty("--image", `url("${city.images[timeOfDay.id]}")`);
    card.innerHTML = `
      <button class="window-button" type="button" aria-expanded="${isOpen}" aria-label="${
        isOpen ? "Close" : "Open"
      } ${city.city} window">
        <span class="window-scene" aria-hidden="true">
          <span class="view-image"></span>
          <span class="window-reflection"></span>
          <span class="window-ledges"></span>
        </span>
        <span class="window-label">
          <strong>${city.city}</strong>
          <time>${cityTime.main}${cityTime.period}</time>
          <span class="window-date">${getDateWord(cityTime, localTime)}, ${city.offsetLabel}</span>
          <span class="open-note">${timeOfDay.label}</span>
        </span>
      </button>
    `;

    card.querySelector(".window-button").addEventListener("click", () => {
      const wasOpen = state.openWindows.has(city.id);
      if (wasOpen) {
        state.openWindows.delete(city.id);
      } else {
        state.openWindows.add(city.id);
      }
      render();
    });

    windowGrid.append(card);
  });
}

function renderChoices(now) {
  cityChoices.innerHTML = "";

  cityData.forEach((city) => {
    const cityTime = getTime(now, city.zone);
    const timeOfDay = getTimeOfDay(cityTime.hour24);
    const isVisible = state.visibleCities.has(city.id);
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.style.setProperty("--image", `url("${city.images[timeOfDay.id]}")`);
    button.innerHTML = `
      <span class="choice-thumb" aria-hidden="true"></span>
      <span>
        <strong>${city.city}</strong>
        <span>${timeOfDay.label}</span>
      </span>
      <em>${isVisible ? "Added" : "Add"}</em>
    `;

    button.addEventListener("click", () => {
      if (isVisible) {
        state.visibleCities.delete(city.id);
        state.openWindows.delete(city.id);
      } else {
        state.visibleCities.add(city.id);
        state.openWindows.add(city.id);
      }
      render();
    });

    cityChoices.append(button);
  });
}

function setGridMode(nextGridMode) {
  state.gridMode = nextGridMode;
  app.classList.toggle("grid-mode", state.gridMode);
  windowModeBtn.setAttribute("aria-pressed", String(state.gridMode));
  windowModeBtn.setAttribute(
    "aria-label",
    state.gridMode ? "Switch to list view" : "Switch to window grid",
  );
}

function setSheet(open) {
  addSheet.classList.toggle("visible", open);
  addSheet.setAttribute("aria-hidden", String(!open));
}

function render() {
  const now = new Date();
  const localTime = getTime(now, "America/Indiana/Indianapolis");
  localStatusTime.textContent = localTime.main;
  renderList(now);
  renderGrid(now);
  renderChoices(now);
}

windowModeBtn.addEventListener("click", () => {
  setGridMode(!state.gridMode);
});

addBtn.addEventListener("click", () => {
  setSheet(true);
});

closeSheet.addEventListener("click", () => {
  setSheet(false);
});

addSheet.addEventListener("click", (event) => {
  if (event.target === addSheet) {
    setSheet(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setSheet(false);
  }
});

setGridMode(false);
render();
setInterval(render, 1000 * 20);
