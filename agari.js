const tiles = [
  ...Array.from({ length: 9 }, (_, i) => ({ id: i, suit: "man", rank: i + 1, label: `${i + 1}萬` })),
  ...Array.from({ length: 9 }, (_, i) => ({ id: i + 9, suit: "pin", rank: i + 1, label: `${i + 1}筒` })),
  ...Array.from({ length: 9 }, (_, i) => ({ id: i + 18, suit: "sou", rank: i + 1, label: `${i + 1}索` })),
  { id: 27, suit: "honor", rank: "東", label: "東" },
  { id: 28, suit: "honor", rank: "南", label: "南" },
  { id: 29, suit: "honor", rank: "西", label: "西" },
  { id: 30, suit: "honor", rank: "北", label: "北" },
  { id: 31, suit: "honor", rank: "白", label: "白" },
  { id: 32, suit: "honor", rank: "發", label: "發" },
  { id: 33, suit: "honor", rank: "中", label: "中" },
];

const redTiles = [
  { id: 34, canonicalId: 4, suit: "man", rank: 5, label: "赤5萬", red: true },
  { id: 35, canonicalId: 13, suit: "pin", rank: 5, label: "赤5筒", red: true },
  { id: 36, canonicalId: 22, suit: "sou", rank: 5, label: "赤5索", red: true },
];

const candidateTiles = [
  ...tiles.slice(0, 5),
  redTiles[0],
  ...tiles.slice(5, 14),
  redTiles[1],
  ...tiles.slice(14, 23),
  redTiles[2],
  ...tiles.slice(23),
];

const modes = [
  { id: "hand", label: "手牌" },
  { id: "ankan", label: "暗カン" },
  { id: "chi", label: "チー" },
  { id: "minkan", label: "明カン" },
  { id: "pon", label: "ポン" },
  { id: "kakan", label: "加カン" },
];

const winds = [
  { value: "east", label: "東" },
  { value: "south", label: "南" },
  { value: "west", label: "西" },
  { value: "north", label: "北" },
];

const situationOptions = [
  { id: "riichi", label: "立直" },
  { id: "doubleRiichi", label: "ダブル立直" },
  { id: "ippatsu", label: "一発" },
  { id: "menzenTsumo", label: "面前ツモ" },
  { id: "houtei", label: "河底" },
  { id: "haitei", label: "海底" },
  { id: "rinshan", label: "嶺上開花" },
  { id: "chankan", label: "槍槓" },
];

const terminalHonorIds = new Set([0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]);

const state = {
  hand: Array(13).fill(null),
  selectedSlot: null,
  mode: "hand",
  dora: [],
  melds: [],
  winningTile: null,
  improvementTile: null,
  pendingChi: null,
  winType: "ron",
  hanAdjustment: 0,
  situation: {
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    menzenTsumo: false,
    houtei: false,
    haitei: false,
    rinshan: false,
    chankan: false,
  },
};

const history = [];

function captureSnapshot() {
  return {
    state: JSON.parse(JSON.stringify(state)),
    roundWind: document.getElementById("roundWind")?.value ?? "east",
    seatWind: document.getElementById("seatWind")?.value ?? "east",
    honba: document.getElementById("honba")?.value ?? "0",
  };
}

function restoreSnapshot(snapshot) {
  Object.assign(state, JSON.parse(JSON.stringify(snapshot.state)));
  document.getElementById("roundWind").value = snapshot.roundWind;
  document.getElementById("seatWind").value = snapshot.seatWind;
  document.getElementById("honba").value = snapshot.honba;
}

function recordedChange(change) {
  const before = captureSnapshot();
  change();
  const after = captureSnapshot();
  if (JSON.stringify(before) !== JSON.stringify(after)) history.push(before);
  render();
}

function undoLastAction() {
  const previous = history.pop();
  if (!previous) return;
  restoreSnapshot(previous);
  render();
}

function tileById(id) {
  return id >= 34 ? redTiles[id - 34] : tiles[id];
}

function canonicalId(id) {
  const tile = tileById(id);
  return tile.canonicalId ?? tile.id;
}

function ruleTile(id) {
  return tiles[canonicalId(id)];
}

function svgFace(contents, faceClass = "") {
  return `<svg class="face-svg ${faceClass}" viewBox="0 0 48 66" aria-hidden="true">${contents}</svg>`;
}

function pinMark(x, y, color = "blue", large = false) {
  const scale = large ? 1.75 : 0.82;
  const petals = Array.from({ length: 8 }, (_, index) => (
    `<ellipse class="pin-petal" cx="0" cy="-4.1" rx="1.45" ry="3" transform="rotate(${index * 45})"></ellipse>`
  )).join("");
  return `<g class="pin-mark ${color}" transform="translate(${x} ${y})">
    <g transform="scale(${scale})">
      <circle class="pin-ring" r="7"></circle>
      ${petals}
      <circle class="pin-core" r="2.05"></circle>
      ${large ? '<circle class="pin-center-ring" r="4.25"></circle>' : ""}
    </g>
  </g>`;
}

function pinFace(rank, red) {
  if (rank === 1) {
    return svgFace(`${pinMark(24, 33, "blue", true)}<circle class="one-pin-center" cx="24" cy="33" r="5"></circle>`, "pin-svg");
  }
  const layouts = {
    2: [[24, 18, "blue"], [24, 48, "blue"]],
    3: [[13, 15, "blue"], [24, 33, "red"], [35, 51, "blue"]],
    4: [[14, 18, "blue"], [34, 18, "blue"], [14, 48, "blue"], [34, 48, "blue"]],
    5: [[13, 15, "blue"], [35, 15, "blue"], [24, 33, "red"], [13, 51, "blue"], [35, 51, "blue"]],
    6: [[14, 13, "blue"], [34, 13, "blue"], [14, 33, "red"], [34, 33, "red"], [14, 53, "red"], [34, 53, "red"]],
    7: [[12, 12, "blue"], [24, 23, "blue"], [36, 34, "blue"], [14, 45, "red"], [34, 45, "red"], [14, 57, "red"], [34, 57, "red"]],
    8: [[14, 10, "blue"], [34, 10, "blue"], [14, 25, "blue"], [34, 25, "blue"], [14, 41, "blue"], [34, 41, "blue"], [14, 56, "blue"], [34, 56, "blue"]],
    9: [[11, 12, "blue"], [24, 12, "blue"], [37, 12, "blue"], [11, 33, "red"], [24, 33, "red"], [37, 33, "red"], [11, 54, "blue"], [24, 54, "blue"], [37, 54, "blue"]],
  };
  const marks = layouts[rank].map(([x, y, color]) => {
    return pinMark(x, y, red && rank === 5 ? "aka" : color);
  }).join("");
  return svgFace(marks, "pin-svg");
}

function souStick(x, y, red = false, angle = 0) {
  return `<g class="sou-stick ${red ? "red" : ""}" transform="translate(${x} ${y}) rotate(${angle})">
    <path class="bamboo-body" d="M-3 -10 Q0 -12 3 -10 L2.3 -3 Q0 -1.2 -2.3 -3 Z M-2.5 -1 Q0 -2.8 2.5 -1 L2 7 Q0 9 -2 7 Z M-2 8 Q0 6.5 2 8 L1.5 11 L-1.5 11 Z"></path>
    <path class="bamboo-knot" d="M-3.3 -2.4 Q0 -0.5 3.3 -2.4 M-2.7 7 Q0 8.7 2.7 7"></path>
  </g>`;
}

function souEight() {
  return `<svg class="face-svg sou-svg sou-eight-svg" viewBox="0 0 100 140" aria-hidden="true">
    <g class="sou-eight">
      <path class="eight-outline diagonal" d="M39 58 L50 43 L61 58 M39 82 L50 97 L61 82"></path>
      <path class="eight-fill diagonal" d="M39 58 L50 43 L61 58 M39 82 L50 97 L61 82"></path>
      <path class="eight-outline upright" d="M25 20 V58 M75 20 V58 M25 82 V120 M75 82 V120"></path>
      <path class="eight-fill upright" d="M25 20 V58 M75 20 V58 M25 82 V120 M75 82 V120"></path>
      <path class="eight-outline knot" d="M16 48 H34 M66 48 H84 M16 92 H34 M66 92 H84"></path>
      <path class="eight-fill knot" d="M16 48 H34 M66 48 H84 M16 92 H34 M66 92 H84"></path>
      <path class="eight-outline diagonal-knot" d="M35 58 L42 64 M58 64 L65 58 M35 82 L42 76 M58 76 L65 82"></path>
      <path class="eight-fill diagonal-knot" d="M35 58 L42 64 M58 64 L65 58 M35 82 L42 76 M58 76 L65 82"></path>
    </g>
  </svg>`;
}

function souBird() {
  return svgFace(`<g class="sou-peacock">
    <path class="tail-feather" d="M22 35 C6 32 5 15 8 7 C15 11 20 20 23 31"></path>
    <path class="tail-feather" d="M24 33 C15 20 19 7 24 3 C30 9 29 22 25 32"></path>
    <path class="tail-feather" d="M26 34 C30 19 38 12 42 9 C44 21 37 32 28 36"></path>
    <circle class="eye-tail" cx="12" cy="14" r="3"></circle>
    <circle class="eye-tail" cx="24" cy="10" r="3"></circle>
    <circle class="eye-tail" cx="37" cy="16" r="3"></circle>
    <circle class="eye-core" cx="12" cy="14" r="1.3"></circle>
    <circle class="eye-core" cx="24" cy="10" r="1.3"></circle>
    <circle class="eye-core" cx="37" cy="16" r="1.3"></circle>
    <path class="body" d="M25 25 C33 27 34 37 29 42 L34 52 L26 47 L24 61 L21 46 L13 52 L19 41 C14 36 16 28 25 25 Z"></path>
    <path class="wing" d="M22 31 C15 34 16 41 23 40 L28 35"></path>
    <path class="neck" d="M25 27 C22 21 25 17 29 16"></path>
    <circle class="head" cx="29" cy="17" r="3.8"></circle>
    <circle class="bird-eye" cx="30" cy="16" r="0.9"></circle>
    <path class="beak" d="M32 17 L38 19 L32 20 Z"></path>
  </g>`, "sou-svg");
}

function souFace(rank, red) {
  if (rank === 1) return souBird();
  if (rank === 7) {
    const sevenSticks = [
      [24, 11, true, 0],
      [12, 32, false, 0], [24, 32, false, 0], [36, 32, false, 0],
      [12, 54, false, 0], [24, 54, false, 0], [36, 54, false, 0],
    ];
    return svgFace(sevenSticks.map(([x, y, isRed, angle]) => souStick(x, y, isRed, angle)).join(""), "sou-svg");
  }
  if (rank === 8) {
    return souEight();
  }
  const layouts = {
    2: [[24, 19], [24, 47]],
    3: [[24, 12], [15, 42], [33, 42]],
    4: [[15, 18], [33, 18], [15, 48], [33, 48]],
    5: [[14, 14], [34, 14], [24, 33], [14, 52], [34, 52]],
    6: [[12, 14], [24, 14], [36, 14], [12, 50], [24, 50], [36, 50]],
    9: [[11, 11], [24, 11], [37, 11], [11, 33], [24, 33], [37, 33], [11, 55], [24, 55], [37, 55]],
  };
  const sticks = layouts[rank].map(([x, y], index) => {
    const standardRed = (rank === 5 && index === 2)
      || (rank === 9 && [1, 4, 7].includes(index));
    const isColoredStick = red && rank === 5 ? true : standardRed;
    return souStick(x, y, isColoredStick);
  }).join("");
  return svgFace(sticks, "sou-svg");
}

function renderTile(id, extraClass = "") {
  if (id === null || id === undefined) return "";
  const tile = tileById(id);
  if (tile.suit === "honor") {
    if (tile.rank === "白") {
      return `<div class="tile honor white ${extraClass}" aria-label="白"></div>`;
    }
    const color = tile.rank === "發" ? "green" : tile.rank === "中" ? "red" : "";
    return `<div class="tile honor ${color} ${extraClass}">${svgFace(`<text x="24" y="47">${tile.rank}</text>`, "honor-svg")}</div>`;
  }
  const redClass = tile.red ? " red-five" : "";
  if (tile.suit === "man") {
    const numbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
    return `<div class="tile man${redClass} ${extraClass}">${svgFace(`<text class="man-rank" x="24" y="28">${numbers[tile.rank - 1]}</text><text class="man-suit" x="24" y="53">萬</text>`, "man-svg")}</div>`;
  }
  if (tile.suit === "pin") {
    return `<div class="tile pin${redClass} ${extraClass}">${pinFace(tile.rank, tile.red)}</div>`;
  }
  return `<div class="tile sou${redClass} ${extraClass}">${souFace(tile.rank, tile.red)}</div>`;
}

function sortHand() {
  const filled = state.hand
    .filter((id) => id !== null)
    .sort((a, b) => canonicalId(a) - canonicalId(b) || Number(tileById(b).red) - Number(tileById(a).red));
  state.hand = Array(13).fill(null);
  filled.slice(0, 13).forEach((id, index) => {
    state.hand[index] = id;
  });
  state.selectedSlot = null;
}

function usedCounts() {
  const counts = Array(34).fill(0);
  state.hand.forEach((id) => {
    if (id !== null) counts[canonicalId(id)] += 1;
  });
  state.melds.forEach((meld) => meld.tiles.forEach((id) => (counts[canonicalId(id)] += 1)));
  return counts;
}

function hasRedTile(id) {
  return state.hand.includes(id) || state.melds.some((meld) => meld.tiles.includes(id));
}

function concealedCount() {
  return state.hand.filter((id) => id !== null).length;
}

function targetConcealedCount() {
  return Math.max(1, 13 - state.melds.length * 3);
}

function clearImprovementGuide() {
  state.improvementTile = null;
}

function clearPendingChi() {
  state.pendingChi = null;
}

function addTileToHand(id) {
  const counts = usedCounts();
  if (counts[canonicalId(id)] >= 4) return;
  if (tileById(id).red && hasRedTile(id)) return;
  if (state.selectedSlot !== null) {
    state.hand[state.selectedSlot] = id;
    state.winningTile = null;
    clearImprovementGuide();
    clearPendingChi();
    sortHand();
    return;
  }
  const limit = targetConcealedCount();
  const firstEmpty = state.hand.findIndex((tileId, index) => tileId === null && index < limit);
  if (firstEmpty !== -1) {
    state.hand[firstEmpty] = id;
    state.winningTile = null;
    clearImprovementGuide();
    clearPendingChi();
    sortHand();
  }
}

function removeTilesFromHand(tileIds) {
  tileIds.forEach((id) => {
    const index = state.hand.findIndex((handId) => handId !== null && canonicalId(handId) === canonicalId(id));
    if (index !== -1) state.hand[index] = null;
  });
  state.winningTile = null;
  clearImprovementGuide();
  clearPendingChi();
  sortHand();
}

function possibleChiChoices(id) {
  const baseId = canonicalId(id);
  const tile = ruleTile(id);
  if (tile.suit === "honor") return [];
  const suitStart = Math.floor(baseId / 9) * 9;
  const suitEnd = suitStart + 8;
  const handCounts = countsFromHand();
  return [baseId - 2, baseId - 1, baseId].flatMap((start) => {
    if (start < suitStart || start + 2 > suitEnd) return [];
    const needed = [start, start + 1, start + 2].filter((tileId) => tileId !== baseId);
    const hasNeeded = needed.every((tileId) => handCounts[tileId] > 0)
      && (needed[0] !== needed[1] || handCounts[needed[0]] > 1);
    if (!hasNeeded) return [];
    const tiles = [start, start + 1, start + 2].map((tileId) => (tileId === baseId ? id : tileId));
    return [{
      called: id,
      tiles,
      handTilesToRemove: tiles.filter((tileId) => canonicalId(tileId) !== baseId),
    }];
  });
}

function applyChiChoice(choice) {
  state.melds.push({ type: "chi", label: "チー", tiles: choice.tiles });
  state.winningTile = null;
  clearImprovementGuide();
  const removeTiles = choice.handTilesToRemove;
  clearPendingChi();
  removeTilesFromHand(removeTiles);
  state.mode = "hand";
}

function makeMeld(mode, id) {
  if (mode !== "kakan" && state.melds.length >= 4) return;
  if (tileById(id).red && hasRedTile(id)) return;
  let meldTiles = [];
  let handTilesToRemove = [];
  let label = "";
  const baseId = canonicalId(id);
  if (mode === "chi") {
    const choices = possibleChiChoices(id);
    if (choices.length === 0) return;
    if (choices.length > 1) {
      state.pendingChi = { called: id, choices };
      return;
    }
    applyChiChoice(choices[0]);
    return;
  } else if (mode === "pon") {
    meldTiles = [id, baseId, baseId];
    handTilesToRemove = [baseId, baseId];
    label = "ポン";
  } else if (mode === "ankan" || mode === "minkan") {
    meldTiles = [id, baseId, baseId, baseId];
    handTilesToRemove = mode === "minkan" ? [baseId, baseId, baseId] : [baseId, baseId, baseId, baseId];
    label = mode === "ankan" ? "暗カン" : "明カン";
  } else if (mode === "kakan") {
    const pon = state.melds.find((meld) => meld.type === "pon" && canonicalId(meld.tiles[0]) === baseId);
    if (!pon) return;
    pon.type = "minkan";
    pon.label = "加カン";
    pon.tiles.push(id);
    removeTilesFromHand([baseId]);
    clearPendingChi();
    state.mode = "hand";
    return;
  }
  state.melds.push({ type: mode, label, tiles: meldTiles });
  state.winningTile = null;
  clearImprovementGuide();
  clearPendingChi();
  removeTilesFromHand(handTilesToRemove);
  state.mode = "hand";
}

function onCandidateClick(id) {
  recordedChange(() => {
    if (state.mode === "dora") {
      state.dora.push(id);
      clearPendingChi();
      state.mode = "hand";
    } else if (state.mode === "hand") {
      addTileToHand(id);
    } else {
      makeMeld(state.mode, id);
    }
  });
}

function countsFromHand() {
  const counts = Array(34).fill(0);
  state.hand.forEach((id) => {
    if (id !== null) counts[canonicalId(id)] += 1;
  });
  return counts;
}

function canMakeMelds(counts, meldsNeeded) {
  if (meldsNeeded === 0) return counts.every((count) => count === 0);
  const first = counts.findIndex((count) => count > 0);
  if (first === -1) return false;
  if (counts[first] >= 3) {
    counts[first] -= 3;
    if (canMakeMelds(counts, meldsNeeded - 1)) {
      counts[first] += 3;
      return true;
    }
    counts[first] += 3;
  }
  const tile = tileById(first);
  if (tile.suit !== "honor" && tile.rank <= 7 && counts[first + 1] > 0 && counts[first + 2] > 0) {
    counts[first] -= 1;
    counts[first + 1] -= 1;
    counts[first + 2] -= 1;
    if (canMakeMelds(counts, meldsNeeded - 1)) {
      counts[first] += 1;
      counts[first + 1] += 1;
      counts[first + 2] += 1;
      return true;
    }
    counts[first] += 1;
    counts[first + 1] += 1;
    counts[first + 2] += 1;
  }
  return false;
}

function isStandardWin(counts, openMeldCount) {
  const meldsNeeded = 4 - openMeldCount;
  for (let i = 0; i < 34; i += 1) {
    if (counts[i] >= 2) {
      counts[i] -= 2;
      if (canMakeMelds(counts, meldsNeeded)) {
        counts[i] += 2;
        return true;
      }
      counts[i] += 2;
    }
  }
  return false;
}

function isChiitoi(counts) {
  return state.melds.length === 0 && counts.filter((count) => count === 2).length === 7;
}

function isKokushi(counts) {
  if (state.melds.length > 0) return false;
  let hasPair = false;
  for (const id of terminalHonorIds) {
    if (counts[id] === 0) return false;
    if (counts[id] >= 2) hasPair = true;
  }
  return hasPair;
}

function isWinningCountsAfterDraw(counts, id) {
  if (counts[id] >= 4) return false;
  const completed = [...counts];
  completed[id] += 1;
  const total = completed.reduce((sum, count) => sum + count, 0) + state.melds.length * 3;
  if (total !== 14) return false;
  return isStandardWin([...completed], state.melds.length) || isChiitoi(completed) || isKokushi(completed);
}

function winningTilesForCounts(counts) {
  return tiles.filter((tile) => isWinningCountsAfterDraw(counts, tile.id)).map((tile) => tile.id);
}

function winningTiles() {
  const concealed = concealedCount();
  const target = targetConcealedCount();
  if (concealed !== target) return [];
  return winningTilesForCounts(countsFromHand());
}

function tenpaiImprovingTiles() {
  if (concealedCount() !== targetConcealedCount()) return [];
  const handCounts = countsFromHand();
  const visibleCounts = usedCounts();
  return tiles
    .filter((tile) => visibleCounts[tile.id] < 4)
    .filter((tile) => {
      const afterDraw = [...handCounts];
      afterDraw[tile.id] += 1;
      for (let discard = 0; discard < 34; discard += 1) {
        if (afterDraw[discard] === 0) continue;
        const afterDiscard = [...afterDraw];
        afterDiscard[discard] -= 1;
        if (winningTilesForCounts(afterDiscard).length > 0) return true;
      }
      return false;
    })
    .map((tile) => tile.id);
}

function withHypotheticalHand(hand, action) {
  const originalHand = state.hand;
  state.hand = hand;
  try {
    return action();
  } finally {
    state.hand = originalHand;
  }
}

function discardGuideForImprovement(improvementTile) {
  const guide = new Map();
  if (improvementTile === null) return guide;
  const afterDraw = countsFromHand();
  afterDraw[canonicalId(improvementTile)] += 1;
  state.hand.forEach((id, index) => {
    if (id === null) return;
    const afterDiscard = [...afterDraw];
    afterDiscard[canonicalId(id)] -= 1;
    const waits = winningTilesForCounts(afterDiscard);
    if (waits.length === 0) return;
    const hypotheticalHand = state.hand.map((tileId, tileIndex) => (tileIndex === index ? improvementTile : tileId));
    const assessment = withHypotheticalHand(hypotheticalHand, () => {
      const yakuman = waits.some((wait) => interpretations(wait).some((hand) => yakumanFor(hand, state.winType, completeTiles(wait)).length > 0));
      if (yakuman) return { color: "gold", category: "役満聴牌" };
      if (waits.length >= 3) return { color: "red", category: "多面張" };
      if (waits.length === 2) return { color: "yellow", category: "両面・シャンポン" };
      const shapes = interpretations(waits[0]).map((hand) => hand.wait).filter(Boolean);
      if (shapes.includes("ryanmen") || shapes.includes("shanpon")) return { color: "yellow", category: "両面・シャンポン" };
      return { color: "blue", category: "単騎・カンチャン・ペンチャン" };
    });
    guide.set(index, { ...assessment, waits });
  });
  return guide;
}

function applyImprovementDiscard(index) {
  if (state.improvementTile === null) return;
  const guide = discardGuideForImprovement(state.improvementTile);
  if (!guide.has(index)) return;
  state.hand[index] = state.improvementTile;
  state.winningTile = null;
  clearImprovementGuide();
  clearPendingChi();
  sortHand();
}

function isHonor(id) {
  return canonicalId(id) >= 27;
}

function isTerminalOrHonor(id) {
  const canonical = canonicalId(id);
  return isHonor(canonical) || canonical % 9 === 0 || canonical % 9 === 8;
}

function isTerminal(id) {
  const canonical = canonicalId(id);
  return !isHonor(canonical) && (canonical % 9 === 0 || canonical % 9 === 8);
}

function isClosedHand() {
  return state.melds.every((meld) => meld.type === "ankan");
}

function completeCounts(winningTile) {
  const counts = countsFromHand();
  counts[canonicalId(winningTile)] += 1;
  return counts;
}

function completeTiles(winningTile) {
  const list = state.hand.filter((id) => id !== null).concat(winningTile);
  state.melds.forEach((meld) => list.push(...meld.tiles));
  return list;
}

function findMeldArrangements(counts, needed, groups = [], results = []) {
  if (needed === 0) {
    if (counts.every((count) => count === 0)) results.push(groups);
    return results;
  }
  const first = counts.findIndex((count) => count > 0);
  if (first === -1) return results;
  if (counts[first] >= 3) {
    const next = [...counts];
    next[first] -= 3;
    findMeldArrangements(next, needed - 1, groups.concat({ type: "triplet", tile: first, open: false, concealed: true }), results);
  }
  const tile = tileById(first);
  if (tile.suit !== "honor" && tile.rank <= 7 && counts[first + 1] > 0 && counts[first + 2] > 0) {
    const next = [...counts];
    next[first] -= 1;
    next[first + 1] -= 1;
    next[first + 2] -= 1;
    findMeldArrangements(next, needed - 1, groups.concat({ type: "sequence", tile: first, open: false, concealed: true }), results);
  }
  return results;
}

function openGroups() {
  return state.melds.map((meld) => {
    if (meld.type === "chi") return { type: "sequence", tile: Math.min(...meld.tiles.map(canonicalId)), open: true, concealed: false };
    if (meld.type === "pon") return { type: "triplet", tile: meld.tiles[0], open: true, concealed: false };
    return { type: "kan", tile: meld.tiles[0], open: meld.type === "minkan", concealed: meld.type === "ankan" };
  });
}

function waitTypes(pair, concealedGroups, winningTile) {
  const waits = new Set();
  if (pair === winningTile) waits.add("tanki");
  concealedGroups.forEach((group) => {
    if (group.type === "triplet" && group.tile === winningTile) waits.add("shanpon");
    if (group.type !== "sequence" || winningTile < group.tile || winningTile > group.tile + 2) return;
    const startRank = tileById(group.tile).rank;
    if (winningTile === group.tile + 1) waits.add("kanchan");
    else if ((startRank === 1 && winningTile === group.tile + 2) || (startRank === 7 && winningTile === group.tile)) waits.add("penchan");
    else waits.add("ryanmen");
  });
  return Array.from(waits);
}

function interpretations(winningTile) {
  const counts = completeCounts(winningTile);
  if (isKokushi(counts)) return [{ kind: "kokushi" }];
  if (isChiitoi(counts)) return [{ kind: "chiitoi" }];
  const interpretations = [];
  const needed = 4 - state.melds.length;
  for (let pair = 0; pair < 34; pair += 1) {
    if (counts[pair] < 2) continue;
    const remaining = [...counts];
    remaining[pair] -= 2;
    findMeldArrangements(remaining, needed).forEach((concealedGroups) => {
      waitTypes(pair, concealedGroups, winningTile).forEach((wait) => {
        interpretations.push({
          kind: "standard",
          pair,
          wait,
          groups: concealedGroups.concat(openGroups()),
        });
      });
    });
  }
  return interpretations;
}

function selectedWindTile(selectId) {
  const map = { east: 27, south: 28, west: 29, north: 30 };
  return map[document.getElementById(selectId).value];
}

function yakuItem(name, closedHan, openHan = closedHan) {
  return { name, han: isClosedHand() ? closedHan : openHan };
}

function addFlushYaku(yaku, tileList) {
  const suits = new Set(tileList.filter((id) => !isHonor(id)).map((id) => ruleTile(id).suit));
  const hasHonor = tileList.some(isHonor);
  if (suits.size === 1 && !hasHonor) yaku.push(yakuItem("清一色", 6, 5));
  else if (suits.size === 1 && hasHonor) yaku.push(yakuItem("混一色", 3, 2));
}

function tripletGroups(groups) {
  return groups.filter((group) => group.type === "triplet" || group.type === "kan");
}

function hasSequenceAcrossSuits(groups) {
  const sequences = groups.filter((group) => group.type === "sequence" && group.tile < 27);
  for (let start = 1; start <= 7; start += 1) {
    if ([0, 9, 18].every((base) => sequences.some((group) => group.tile === base + start - 1))) return true;
  }
  return false;
}

function hasStraight(groups) {
  const sequences = groups.filter((group) => group.type === "sequence");
  return [0, 9, 18].some((base) => [0, 3, 6].every((offset) => sequences.some((group) => group.tile === base + offset)));
}

function pairFu(pair) {
  let fu = 0;
  if (pair >= 31) fu += 2;
  if (pair === selectedWindTile("roundWind")) fu += 2;
  if (pair === selectedWindTile("seatWind")) fu += 2;
  return fu;
}

function standardYaku(hand, winningTile, winType, tileList) {
  const yaku = [];
  const groups = hand.groups;
  const triplets = tripletGroups(groups);
  const closed = isClosedHand();
  const allSequences = groups.every((group) => group.type === "sequence");
  if (tileList.every((id) => !isTerminalOrHonor(id))) yaku.push(yakuItem("断么九", 1));
  if (closed && allSequences && pairFu(hand.pair) === 0 && hand.wait === "ryanmen") yaku.push({ name: "平和", han: 1 });
  const dragonNames = { 31: "白", 32: "發", 33: "中" };
  triplets.forEach((group) => {
    if (group.tile >= 31) yaku.push({ name: `役牌 ${dragonNames[group.tile]}`, han: 1 });
    if (group.tile === selectedWindTile("roundWind")) yaku.push({ name: "場風", han: 1 });
    if (group.tile === selectedWindTile("seatWind")) yaku.push({ name: "自風", han: 1 });
  });
  if (groups.every((group) => group.type !== "sequence")) yaku.push({ name: "対々和", han: 2 });
  let concealedTriplets = triplets.filter((group) => !group.open).length;
  if (winType === "ron" && hand.wait === "shanpon") concealedTriplets -= 1;
  if (concealedTriplets >= 3) yaku.push({ name: "三暗刻", han: 2 });
  const kans = groups.filter((group) => group.type === "kan").length;
  if (kans >= 3) yaku.push({ name: "三槓子", han: 2 });
  const dragonTriplets = triplets.filter((group) => group.tile >= 31).length;
  if (dragonTriplets === 2 && hand.pair >= 31) yaku.push({ name: "小三元", han: 2 });
  if (tileList.every(isTerminalOrHonor)) yaku.push({ name: "混老頭", han: 2 });
  if (hasSequenceAcrossSuits(groups)) yaku.push(yakuItem("三色同順", 2, 1));
  if (hasStraight(groups)) yaku.push(yakuItem("一気通貫", 2, 1));
  if (closed) {
    const sequenceKeys = groups.filter((group) => group.type === "sequence").map((group) => group.tile);
    const duplicatePairs = sequenceKeys.filter((key, index) => sequenceKeys.indexOf(key) !== index).length;
    if (duplicatePairs >= 2) yaku.push({ name: "二盃口", han: 3 });
    else if (duplicatePairs === 1) yaku.push({ name: "一盃口", han: 1 });
  }
  const everyGroupHasOutside = groups.every((group) => {
    if (group.type === "sequence") return tileById(group.tile).rank === 1 || tileById(group.tile).rank === 7;
    return isTerminalOrHonor(group.tile);
  }) && isTerminalOrHonor(hand.pair);
  if (everyGroupHasOutside) {
    if (tileList.every((id) => !isHonor(id))) yaku.push(yakuItem("純全帯么九", 3, 2));
    else if (groups.some((group) => group.type === "sequence")) yaku.push(yakuItem("混全帯么九", 2, 1));
  }
  addFlushYaku(yaku, tileList);
  return yaku;
}

function yakumanFor(hand, winType, tileList) {
  if (hand.kind === "kokushi") return ["国士無双"];
  if (tileList.every(isHonor)) return ["字一色"];
  if (tileList.every(isTerminal)) return ["清老頭"];
  if (hand.kind !== "standard") return [];
  const triplets = tripletGroups(hand.groups);
  const result = [];
  if (triplets.filter((group) => group.tile >= 31).length === 3) result.push("大三元");
  if (hand.groups.filter((group) => group.type === "kan").length === 4) result.push("四槓子");
  let closedTriplets = triplets.filter((group) => !group.open).length;
  if (winType === "ron" && hand.wait === "shanpon") closedTriplets -= 1;
  if (closedTriplets === 4) result.push("四暗刻");
  return result;
}

function yakuFor(hand, winningTile, winType) {
  const tileList = completeTiles(winningTile);
  const yakuman = yakumanFor(hand, winType, tileList);
  if (yakuman.length > 0) return { yaku: yakuman.map((name) => ({ name, han: 13 })), yakuman: true };
  let yaku = [];
  if (hand.kind === "chiitoi") {
    yaku.push({ name: "七対子", han: 2 });
    if (tileList.every((id) => !isTerminalOrHonor(id))) yaku.push({ name: "断么九", han: 1 });
    if (tileList.every(isTerminalOrHonor)) yaku.push({ name: "混老頭", han: 2 });
    addFlushYaku(yaku, tileList);
  } else if (hand.kind === "standard") {
    yaku = standardYaku(hand, winningTile, winType, tileList);
  }
  addSituationYaku(yaku, winType);
  if (state.hanAdjustment !== 0) {
    const sign = state.hanAdjustment > 0 ? "+" : "";
    yaku.push({ name: `追加翻 ${sign}${state.hanAdjustment}`, han: state.hanAdjustment });
  }
  const baseHan = yaku.reduce((total, item) => total + item.han, 0);
  if (baseHan > 0 && state.dora.length > 0) {
    const doraCount = state.dora.reduce(
      (total, doraId) => total + tileList.filter((id) => canonicalId(id) === canonicalId(doraId)).length,
      0,
    );
    if (doraCount > 0) yaku.push({ name: `ドラ ${doraCount}`, han: doraCount });
  }
  const redDoraCount = tileList.filter((id) => tileById(id).red).length;
  if (baseHan > 0 && redDoraCount > 0) yaku.push({ name: `赤ドラ ${redDoraCount}`, han: redDoraCount });
  return { yaku, yakuman: false };
}

function addSituationYaku(yaku, winType) {
  if (state.situation.doubleRiichi) yaku.push({ name: "ダブル立直", han: 2 });
  else if (state.situation.riichi) yaku.push({ name: "立直", han: 1 });
  if (state.situation.ippatsu) yaku.push({ name: "一発", han: 1 });
  if (state.situation.menzenTsumo && winType === "tsumo") yaku.push({ name: "門前清自摸和", han: 1 });
  if (state.situation.houtei && winType === "ron") yaku.push({ name: "河底撈魚", han: 1 });
  if (state.situation.haitei && winType === "tsumo") yaku.push({ name: "海底摸月", han: 1 });
  if (state.situation.rinshan && winType === "tsumo") yaku.push({ name: "嶺上開花", han: 1 });
  if (state.situation.chankan && winType === "ron") yaku.push({ name: "槍槓", han: 1 });
}

function calculateFu(hand, winningTile, winType, yaku) {
  if (hand.kind === "chiitoi") return 25;
  if (hand.kind === "kokushi") return 0;
  if (yaku.some((item) => item.name === "平和")) return winType === "tsumo" ? 20 : 30;
  let fu = 20;
  if (winType === "ron" && isClosedHand()) fu += 10;
  if (winType === "tsumo") fu += 2;
  fu += pairFu(hand.pair);
  if (["tanki", "kanchan", "penchan"].includes(hand.wait)) fu += 2;
  hand.groups.forEach((group) => {
    if (group.type === "sequence") return;
    const outside = isTerminalOrHonor(group.tile);
    let open = group.open;
    if (winType === "ron" && hand.wait === "shanpon" && group.concealed && group.tile === winningTile) open = true;
    if (group.type === "kan") fu += open ? (outside ? 16 : 8) : outside ? 32 : 16;
    else fu += open ? (outside ? 4 : 2) : outside ? 8 : 4;
  });
  if (winType === "ron" && !isClosedHand() && fu === 20) return 30;
  return Math.ceil(fu / 10) * 10;
}

function limitBase(fu, han, yakuman) {
  if (yakuman || han >= 13) return { label: "役満", base: 8000 };
  if (han >= 11) return { label: "三倍満", base: 6000 };
  if (han >= 8) return { label: "倍満", base: 4000 };
  if (han >= 6) return { label: "跳満", base: 3000 };
  if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70)) return { label: "満貫", base: 2000 };
  return { label: "", base: fu * 2 ** (han + 2) };
}

function ceil100(value) {
  return Math.ceil(value / 100) * 100;
}

function scoreFor(fu, han, yakuman, winType) {
  const limit = limitBase(fu, han, yakuman);
  const dealer = document.getElementById("seatWind").value === "east";
  const honba = Number(document.getElementById("honba").value);
  if (winType === "ron") {
    return {
      limit: limit.label,
      text: `${ceil100(limit.base * (dealer ? 6 : 4)) + honba * 300}点`,
    };
  }
  if (dealer) {
    return { limit: limit.label, text: `${ceil100(limit.base * 2) + honba * 100}点オール` };
  }
  return {
    limit: limit.label,
    text: `${ceil100(limit.base) + honba * 100} / ${ceil100(limit.base * 2) + honba * 100}点`,
  };
}

function bestResult(winningTile) {
  const options = interpretations(winningTile).map((hand) => {
    const result = yakuFor(hand, winningTile, state.winType);
    const han = result.yaku.reduce((sum, yaku) => sum + yaku.han, 0);
    if (han <= 0) return { hand, ...result, han: 0, fu: 0, score: null };
    const fu = calculateFu(hand, winningTile, state.winType, result.yaku);
    return { hand, ...result, han, fu, score: scoreFor(fu, han, result.yakuman, state.winType) };
  });
  return options.sort((a, b) => {
    const aBase = a.score ? limitBase(a.fu, a.han, a.yakuman).base : 0;
    const bBase = b.score ? limitBase(b.fu, b.han, b.yakuman).base : 0;
    return bBase - aBase || b.han - a.han || b.fu - a.fu;
  })[0];
}

function renderSelect(id, options, defaultValue) {
  const select = document.getElementById(id);
  if (select.options.length > 0) return;
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    select.appendChild(opt);
  });
  select.value = defaultValue;
}

function renderHand() {
  const container = document.getElementById("handSlots");
  container.innerHTML = "";
  const target = targetConcealedCount();
  const improvementGuide = discardGuideForImprovement(state.improvementTile);
  state.hand.forEach((id, index) => {
    const slot = document.createElement("button");
    slot.type = "button";
    const guidance = improvementGuide.get(index);
    slot.className = `hand-slot ${state.selectedSlot === index ? "selected" : ""} ${guidance ? `discard-highlight discard-${guidance.color}` : ""}`;
    slot.disabled = index >= target;
    slot.innerHTML = id === null ? "" : renderTile(id);
    slot.setAttribute(
      "aria-label",
      id === null
        ? `${index + 1}番目の手牌を選択`
        : guidance
          ? `${tileById(id).label}を捨てて聴牌 (${guidance.category})`
          : `${tileById(id).label}を手牌から外す`,
    );
    slot.addEventListener("click", () => {
      if (id !== null && guidance) {
        recordedChange(() => applyImprovementDiscard(index));
        return;
      }
      if (id !== null) {
        recordedChange(() => {
          state.hand[index] = null;
          state.winningTile = null;
          clearImprovementGuide();
          clearPendingChi();
          sortHand();
        });
        return;
      } else {
        state.selectedSlot = state.selectedSlot === index ? null : index;
      }
      render();
    });
    container.appendChild(slot);
  });
  document.getElementById("handCount").textContent = `${concealedCount()} / ${target}`;
}

function renderCandidates() {
  renderChiChoices();
  const container = document.getElementById("tileCandidates");
  container.innerHTML = "";
  const counts = usedCounts();
  candidateTiles.forEach((tile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile-button";
    button.setAttribute("aria-label", `${tile.label}を選択`);
    button.setAttribute("data-testid", `candidate-${tile.id}`);
    button.innerHTML = renderTile(tile.id);
    button.disabled = state.mode === "hand" && (counts[canonicalId(tile.id)] >= 4 || (tile.red && hasRedTile(tile.id)));
    button.addEventListener("click", () => onCandidateClick(tile.id));
    container.appendChild(button);
  });
}

function renderChiChoices() {
  const box = document.getElementById("chiChoices");
  box.innerHTML = "";
  if (!state.pendingChi || state.pendingChi.choices.length <= 1) {
    box.className = "chi-choices";
    return;
  }
  box.className = "chi-choices active";
  const title = document.createElement("div");
  title.className = "chi-choice-title";
  title.textContent = `${tileById(state.pendingChi.called).label}をどの形でチーしますか`;
  box.appendChild(title);

  const buttons = document.createElement("div");
  buttons.className = "chi-choice-buttons";
  state.pendingChi.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chi-choice-button";
    button.setAttribute("aria-label", `${choice.tiles.map((tileId) => tileById(tileId).label).join("")}でチー`);
    button.innerHTML = choice.tiles.map((tileId) => renderTile(tileId)).join("");
    button.addEventListener("click", () => {
      recordedChange(() => applyChiChoice(state.pendingChi.choices[index]));
    });
    buttons.appendChild(button);
  });
  box.appendChild(buttons);
}

function renderModes() {
  const container = document.getElementById("modeButtons");
  container.innerHTML = "";
  modes.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mode-button ${state.mode === mode.id ? "active" : ""}`;
    button.textContent = mode.label;
    button.addEventListener("click", () => {
      state.mode = mode.id;
      state.selectedSlot = null;
      clearPendingChi();
      render();
    });
    container.appendChild(button);
  });
  const hints = {
    hand: "牌を押すと手牌に入ります",
    chi: "鳴く牌を押すと手牌の2枚でチー",
    pon: "牌を押すと刻子を副露",
    ankan: "牌を押すと暗槓を副露",
    minkan: "牌を押すと明槓を副露",
    kakan: "ポンした牌を押すと加カン",
    dora: "牌を押すとドラになります",
  };
  document.getElementById("modeHint").textContent = hints[state.mode];
  const doraModeButton = document.getElementById("doraModeButton");
  doraModeButton.className = state.mode === "dora" ? "active" : "";
  doraModeButton.onclick = () => {
    state.mode = "dora";
    state.selectedSlot = null;
    clearPendingChi();
    render();
  };
}

function renderDora() {
  const box = document.getElementById("doraBox");
  document.getElementById("doraCount").textContent = `${state.dora.length}枚`;
  if (state.dora.length === 0) {
    box.innerHTML = "未選択";
    return;
  }
  box.innerHTML = "";
  state.dora.forEach((id, index) => {
    const item = document.createElement("div");
    item.className = "dora-item";
    item.innerHTML = `${renderTile(id)}<button type="button" aria-label="ドラを削除">×</button>`;
    item.querySelector("button").addEventListener("click", () => {
      recordedChange(() => state.dora.splice(index, 1));
    });
    box.appendChild(item);
  });
}

function renderMelds() {
  const area = document.getElementById("meldArea");
  area.innerHTML = "";
  state.melds.forEach((meld, index) => {
    const item = document.createElement("div");
    item.className = "meld";
    item.innerHTML = `
      <div class="meld-title">
        <span>${meld.label}</span>
        <button type="button" aria-label="副露を削除">×</button>
      </div>
      <div class="meld-tiles">${meld.tiles.map((id) => renderTile(id)).join("")}</div>
    `;
    item.querySelector("button").addEventListener("click", () => {
      recordedChange(() => state.melds.splice(index, 1));
    });
    area.appendChild(item);
  });
  if (state.melds.length === 0) {
    area.innerHTML = `<div class="message">副露なし</div>`;
  }
  document.getElementById("meldCount").textContent = `${state.melds.length} / 4`;
}

function renderWaits() {
  const waits = winningTiles();
  const container = document.getElementById("waitTiles");
  container.innerHTML = "";
  const status = document.getElementById("waitStatus");
  if (concealedCount() !== targetConcealedCount()) {
    state.winningTile = null;
    clearImprovementGuide();
    status.textContent = `${targetConcealedCount()}枚になるよう入力`;
    container.innerHTML = `<div class="message">手牌枚数を調整してください</div>`;
    return;
  }
  if (waits.length === 0) {
    state.winningTile = null;
    const improving = tenpaiImprovingTiles();
    if (improving.length === 0) {
      clearImprovementGuide();
      status.textContent = "テンパイしていません";
      container.innerHTML = `<div class="message">アガリ牌なし</div>`;
      return;
    }
    if (state.improvementTile !== null && !improving.includes(state.improvementTile)) clearImprovementGuide();
    status.textContent = state.improvementTile === null
      ? `イーシャンテン - 聴牌になる牌 ${improving.length}種`
      : `${tileById(state.improvementTile).label}をツモ - 光っている牌を捨てると聴牌`;
    improving.forEach((id) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `wait-choice improving-choice ${state.improvementTile === id ? "active" : ""}`;
      button.setAttribute("aria-label", `${tileById(id).label}で聴牌へ進む`);
      button.innerHTML = renderTile(id);
      button.addEventListener("click", () => {
        recordedChange(() => {
          state.improvementTile = id;
        });
      });
      container.appendChild(button);
    });
    return;
  }
  clearImprovementGuide();
  if (!waits.includes(state.winningTile)) state.winningTile = waits[0];
  status.textContent = `${waits.length}種`;
  waits.forEach((id) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `wait-choice ${state.winningTile === id ? "active" : ""}`;
    button.setAttribute("aria-label", `${tileById(id).label}でアガリ`);
    button.innerHTML = renderTile(id);
    button.addEventListener("click", () => {
      recordedChange(() => {
        state.winningTile = id;
      });
    });
    container.appendChild(button);
  });
}

function renderWinTypeButtons() {
  const container = document.getElementById("winTypeButtons");
  container.innerHTML = "";
  [
    { id: "ron", label: "ロン" },
    { id: "tsumo", label: "ツモ" },
  ].forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = state.winType === option.id ? "active" : "";
    button.textContent = option.label;
    button.addEventListener("click", () => {
      recordedChange(() => {
        state.winType = option.id;
        normalizeSituation();
      });
    });
    container.appendChild(button);
  });
}

function situationDisabled(id) {
  if (["riichi", "doubleRiichi", "ippatsu", "menzenTsumo"].includes(id) && !isClosedHand()) return true;
  if (id === "ippatsu" && !state.situation.riichi && !state.situation.doubleRiichi) return true;
  if (["menzenTsumo", "haitei", "rinshan"].includes(id) && state.winType !== "tsumo") return true;
  if (["houtei", "chankan"].includes(id) && state.winType !== "ron") return true;
  if (id === "rinshan" && !state.melds.some((meld) => meld.type === "ankan" || meld.type === "minkan")) return true;
  return false;
}

function normalizeSituation() {
  if (!isClosedHand()) {
    state.situation.riichi = false;
    state.situation.doubleRiichi = false;
    state.situation.ippatsu = false;
    state.situation.menzenTsumo = false;
  }
  if (!state.situation.riichi && !state.situation.doubleRiichi) state.situation.ippatsu = false;
  if (state.winType === "ron") {
    state.situation.menzenTsumo = false;
    state.situation.haitei = false;
    state.situation.rinshan = false;
  } else {
    state.situation.houtei = false;
    state.situation.chankan = false;
  }
}

function renderSituationButtons() {
  normalizeSituation();
  const container = document.getElementById("situationButtons");
  container.innerHTML = "";
  situationOptions.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.className = state.situation[option.id] ? "active" : "";
    button.disabled = situationDisabled(option.id);
    button.addEventListener("click", () => {
      recordedChange(() => {
        const next = !state.situation[option.id];
        if (option.id === "riichi" && next) state.situation.doubleRiichi = false;
        if (option.id === "doubleRiichi" && next) state.situation.riichi = false;
        if (option.id === "haitei" && next) state.situation.rinshan = false;
        if (option.id === "rinshan" && next) state.situation.haitei = false;
        if (option.id === "houtei" && next) state.situation.chankan = false;
        if (option.id === "chankan" && next) state.situation.houtei = false;
        state.situation[option.id] = next;
        normalizeSituation();
      });
    });
    container.appendChild(button);
  });
}

function renderHanAdjustmentButtons() {
  const container = document.getElementById("hanAdjustButtons");
  container.innerHTML = `
    <span>追加翻</span>
    <button type="button" data-delta="-1" aria-label="追加翻を減らす">-</button>
    <strong>${state.hanAdjustment > 0 ? "+" : ""}${state.hanAdjustment}</strong>
    <button type="button" data-delta="1" aria-label="追加翻を増やす">+</button>
  `;
  container.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const delta = Number(button.dataset.delta);
      recordedChange(() => {
        state.hanAdjustment = Math.max(-20, Math.min(20, state.hanAdjustment + delta));
      });
    });
  });
}

function renderResult() {
  const container = document.getElementById("agariResult");
  if (state.winningTile === null) {
    container.className = "agari-empty";
    container.textContent = "待ち牌を選ぶと、手役・符・得点を表示します";
    return;
  }
  const result = bestResult(state.winningTile);
  if (!result || result.han === 0) {
    container.className = "agari-empty";
    container.textContent = "手役なし - アガリには1翻以上の役が必要です";
    return;
  }
  const hanText = result.yakuman ? "役満" : `${result.han}翻`;
  const fuText = result.yakuman ? "-" : `${result.fu}符`;
  const limitText = result.score.limit || "通常";
  container.className = "agari-summary";
  container.innerHTML = `
    <div class="agari-tile"><span>アガリ牌</span>${renderTile(state.winningTile)}</div>
    <div class="agari-detail">
      <div class="result-numbers">
        <div class="result-number"><span>符</span><strong>${fuText}</strong></div>
        <div class="result-number"><span>翻</span><strong>${hanText}</strong></div>
        <div class="result-number"><span>区分</span><strong>${limitText}</strong></div>
      </div>
      <div class="yaku-list">${result.yaku.map((item) => `<span class="yaku-tag">${item.name}${result.yakuman ? "" : ` ${item.han}翻`}</span>`).join("")}</div>
      <div class="payment"><span>${state.winType === "ron" ? "ロン得点" : document.getElementById("seatWind").value === "east" ? "子の支払い" : "子 / 親の支払い"}</span><strong>${result.score.text}</strong></div>
    </div>
  `;
}

function render() {
  renderHand();
  renderCandidates();
  renderModes();
  renderDora();
  renderMelds();
  renderWaits();
  renderWinTypeButtons();
  renderSituationButtons();
  renderHanAdjustmentButtons();
  renderResult();
  document.getElementById("undoButton").disabled = history.length === 0;
}

function init() {
  renderSelect("roundWind", winds, "east");
  renderSelect("seatWind", winds, "east");
  renderSelect(
    "honba",
    Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: `${i}本場` })),
    "0",
  );
  ["roundWind", "seatWind", "honba"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => recordedChange(() => {}));
  });
  document.getElementById("undoButton").addEventListener("click", undoLastAction);
  document.getElementById("resetButton").addEventListener("click", () => {
    recordedChange(() => {
      state.hand = Array(13).fill(null);
      state.selectedSlot = null;
      state.mode = "hand";
      state.dora = [];
      state.melds = [];
      state.winningTile = null;
      state.improvementTile = null;
      state.pendingChi = null;
      state.winType = "ron";
      state.hanAdjustment = 0;
      Object.keys(state.situation).forEach((key) => {
        state.situation[key] = false;
      });
    });
  });
  render();
}

init();
