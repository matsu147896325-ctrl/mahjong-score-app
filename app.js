const styleOptions = [
  { id: "menzen", label: "面前" },
  { id: "open", label: "鳴き" },
  { id: "chiitoi", label: "七対子" },
  { id: "pinfu", label: "平和" },
];

const melds = [
  { id: "anko", label: "暗刻", simpleFu: 4, terminalFu: 8 },
  { id: "minko", label: "明刻", simpleFu: 2, terminalFu: 4 },
  { id: "ankan", label: "暗槓", simpleFu: 16, terminalFu: 32 },
  { id: "minkan", label: "明槓", simpleFu: 8, terminalFu: 16 },
];

const headOptions = [
  { id: "normal", label: "通常", fu: 0 },
  { id: "value", label: "役牌", fu: 2 },
];

const waitOptions = [
  { id: "ryanmen", label: "両面", fu: 0 },
  { id: "kanchan", label: "嵌張", fu: 2 },
  { id: "penchan", label: "辺張", fu: 2 },
  { id: "shanpon", label: "双碰", fu: 0 },
  { id: "tanki", label: "単騎", fu: 2 },
  { id: "other", label: "他", fu: 0 },
];

const state = {
  style: "menzen",
  head: "normal",
  wait: "ryanmen",
  han: 1,
  honba: 0,
  counts: Object.fromEntries(melds.map((meld) => [meld.id, { simple: 0, terminal: 0 }])),
};

const yen = new Intl.NumberFormat("ja-JP");

function createChoiceButton(option, groupName, isActive, onClick, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `choice ${extraClass}`.trim();
  button.textContent = option.label;
  button.setAttribute("aria-pressed", String(isActive));
  button.dataset.group = groupName;
  button.dataset.value = option.id;
  button.setAttribute("data-testid", `${groupName}-${option.id}`);
  button.addEventListener("click", onClick);
  return button;
}

function renderChoiceGroup(containerId, options, groupName, currentValue, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  options.forEach((option) => {
    container.appendChild(
      createChoiceButton(option, groupName, option.id === currentValue, () => {
        onSelect(option.id);
        update();
      }),
    );
  });
}

function renderMeldTable() {
  const table = document.getElementById("meldTable");
  table.innerHTML = "";

  melds.forEach((meld) => {
    const row = document.createElement("div");
    row.className = "meld-row";

    const name = document.createElement("div");
    name.className = "meld-name";
    name.textContent = meld.label;
    row.appendChild(name);

    row.appendChild(createTileGroup(meld, "simple", "2〜8牌", meld.simpleFu));
    row.appendChild(createTileGroup(meld, "terminal", "一九字牌", meld.terminalFu));

    const total = document.createElement("div");
    total.className = "meld-total";
    total.id = `${meld.id}Total`;
    total.textContent = "0符";
    row.appendChild(total);

    table.appendChild(row);
  });
}

function createTileGroup(meld, type, label, fuPerSet) {
  const group = document.createElement("div");
  group.className = "tile-group";

  const heading = document.createElement("div");
  heading.className = "tile-label";
  heading.innerHTML = `<span>${label}</span><span>${fuPerSet}符/個</span>`;
  group.appendChild(heading);

  const buttons = document.createElement("div");
  buttons.className = "count-buttons";

  for (let count = 0; count <= 4; count += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "count-btn";
    button.textContent = count;
    button.setAttribute("data-testid", `${meld.id}-${type}-${count}`);
    button.setAttribute("aria-pressed", String(state.counts[meld.id][type] === count));
    button.addEventListener("click", () => {
      state.counts[meld.id][type] = count;
      update();
    });
    buttons.appendChild(button);
  }

  group.appendChild(buttons);
  return group;
}

function renderHanGroup() {
  const container = document.getElementById("hanGroup");
  container.innerHTML = "";
  for (let han = 1; han <= 13; han += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `han-btn ${han === 13 ? "yakuman" : ""}`;
    button.textContent = han === 13 ? "13 役満" : `${han}`;
    button.setAttribute("data-testid", `han-${han}`);
    button.setAttribute("aria-pressed", String(state.han === han));
    button.addEventListener("click", () => {
      state.han = han;
      update();
    });
    container.appendChild(button);
  }
}

function renderHonbaSelect() {
  const select = document.getElementById("honba");
  for (let i = 0; i <= 10; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `${i}本場`;
    select.appendChild(option);
  }
  select.addEventListener("change", (event) => {
    state.honba = Number(event.target.value);
    update();
  });
}

function roundUp100(value) {
  return Math.ceil(value / 100) * 100;
}

function roundFu(value) {
  return Math.ceil(value / 10) * 10;
}

function getSelected(options, id) {
  return options.find((option) => option.id === id);
}

function resetMeldCounts() {
  melds.forEach((meld) => {
    state.counts[meld.id].simple = 0;
    state.counts[meld.id].terminal = 0;
  });
}

function applyStyleDefaults(styleId) {
  if (styleId === "chiitoi") {
    resetMeldCounts();
    state.head = "normal";
    state.wait = "tanki";
    return;
  }

  if (styleId === "pinfu") {
    resetMeldCounts();
    state.wait = "ryanmen";
  }
}

function calcMeldFu(meld) {
  const counts = state.counts[meld.id];
  return counts.simple * meld.simpleFu + counts.terminal * meld.terminalFu;
}

function calcFu(winType) {
  const style = getSelected(styleOptions, state.style);
  if (style.id === "chiitoi") return 25;
  if (style.id === "pinfu") return winType === "ron" ? 30 : 20;

  const meldFu = melds.reduce((total, meld) => total + calcMeldFu(meld), 0);
  const headFu = getSelected(headOptions, state.head).fu;
  const waitFu = getSelected(waitOptions, state.wait).fu;
  const menzenRonFu = winType === "ron" && style.id === "menzen" ? 10 : 0;
  const tsumoFu = winType === "tsumo" ? 2 : 0;
  const rawFu = 20 + meldFu + headFu + waitFu + menzenRonFu + tsumoFu;
  const fu = Math.max(20, roundFu(rawFu));
  return winType === "ron" && style.id === "open" && fu === 20 ? 30 : fu;
}

function getLimit(fu, han) {
  if (han >= 13) return { name: "役満", base: 8000 };
  if (han >= 11) return { name: "三倍満", base: 6000 };
  if (han >= 8) return { name: "倍満", base: 4000 };
  if (han >= 6) return { name: "跳満", base: 3000 };
  if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70)) {
    return { name: "満貫", base: 2000 };
  }
  return { name: "通常", base: fu * 2 ** (han + 2) };
}

function calcRonScore(fu, han, honba) {
  if (fu === 20 || (fu === 25 && han === 1)) {
    return { limitName: "表なし", parent: null, child: null };
  }

  const limit = getLimit(fu, han);
  return {
    limitName: limit.name,
    parent: roundUp100(limit.base * 6) + honba * 300,
    child: roundUp100(limit.base * 4) + honba * 300,
  };
}

function calcTsumoScore(fu, han, honba) {
  if ((fu === 20 || fu === 25) && han === 1) {
    return {
      limitName: "表なし",
      parent: null,
      childFromParent: null,
      childFromChild: null,
    };
  }

  const limit = getLimit(fu, han);
  return {
    limitName: limit.name,
    parent: roundUp100(limit.base * 2) + honba * 100,
    childFromParent: roundUp100(limit.base * 2) + honba * 100,
    childFromChild: roundUp100(limit.base) + honba * 100,
  };
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function scoreText(value) {
  return value === null ? "-" : yen.format(value);
}

function updateButtons() {
  document.querySelectorAll("[data-group='style']").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.value === state.style));
  });
  document.querySelectorAll("[data-group='head']").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.value === state.head));
  });
  document.querySelectorAll("[data-group='wait']").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.value === state.wait));
  });
  renderMeldTable();
  renderHanGroup();
}

function update() {
  updateButtons();
  melds.forEach((meld) => setText(`${meld.id}Total`, `${calcMeldFu(meld)}符`));

  const ronFu = calcFu("ron");
  const tsumoFu = calcFu("tsumo");
  const ronScores = calcRonScore(ronFu, state.han, state.honba);
  const tsumoScores = calcTsumoScore(tsumoFu, state.han, state.honba);
  const hanText = state.han === 13 ? "13翻" : `${state.han}翻`;

  setText("ronFuText", `${ronFu}符`);
  setText("ronHanText", hanText);
  setText("tsumoFuText", `${tsumoFu}符`);
  setText("tsumoHanText", hanText);
  setText("ronParent", scoreText(ronScores.parent));
  setText("ronChild", scoreText(ronScores.child));
  setText("tsumoParent", scoreText(tsumoScores.parent));
  setText("tsumoChildFromParent", scoreText(tsumoScores.childFromParent));
  setText("tsumoChildFromChild", scoreText(tsumoScores.childFromChild));
}

function init() {
  renderChoiceGroup("styleGroup", styleOptions, "style", state.style, (id) => {
    state.style = id;
    applyStyleDefaults(id);
  });
  renderChoiceGroup("headGroup", headOptions, "head", state.head, (id) => {
    state.head = id;
  });
  renderChoiceGroup("waitGroup", waitOptions, "wait", state.wait, (id) => {
    state.wait = id;
  });
  renderHonbaSelect();
  renderMeldTable();
  renderHanGroup();
  update();
}

init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
