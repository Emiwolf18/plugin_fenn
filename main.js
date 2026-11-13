// Pomodoro · Odak — focus & break timer for Fenn, the floating notch for Windows.
// Live plugin: one draw() builds the whole tree from state. A 1 s interval runs
// ONLY while the countdown is actually ticking; everything else is event driven.
//
// Layout, top-packed, no spacers, no justify (page 568x300 -> content 536x232):
// ring row 160 + 8 + buttons 26 + 8 + presets 26 = 228 <= 232.
"use strict";
const url = "https://api.rawg.io/api/games";
const apikey = "?key=e1806d4921bb4981912b086c3c24d315";

const os = require("os");
const fs = require("fs");
const path = require("path");

const fenn = require("./fenn");
// Fenn 0.4.0 uyumluluk: `row` + align:"center" satiri dikey yayiyor; varsayilan hizalama sikipaketler.
const _row = fenn.row;
fenn.row = (c, o = {}) => {
  if (o.align === "center") {
    const { align, ...rest } = o;
    return _row(c, rest);
  }
  return _row(c, o);
};
const app = new fenn.Plugin();

// ---- Strings (TR + EN) -------------------------------------------------

const T = {
  tr: {
    focus: "Odak",
    short: "Mola",
    long: "Uzun mola",
    focusing: "Odaklanıyor",
    onBreak: "Mola",
    ready: "Hazır",
    paused: "Duraklatıldı",
    breakReady: "Mola!",
    breakOver: "Mola bitti",
    breakReadyHint: "Odak tamamlandı, mola hazır.",
    breakOverHint: "Mola bitti, yeni odak hazır.",
    runningHint: "Süre işliyor",
    pausedHint: "Devam için Başlat'a bas",
    readyHint: "Süreyi seç ve Başlat'a bas",
    start: "Başlat",
    resume: "Devam",
    pause: "Duraklat",
    reset: "Sıfırla",
    cycle: "Döngü",
    today: "Bugünkü odak",
    pFocus: "Odak · 25 dk",
    pShort: "Mola · 5 dk",
    pLong: "Uzun mola · 15 dk",
    langTip: "Türkçe / English",
  },
  en: {
    focus: "Focus",
    short: "Break",
    long: "Long break",
    focusing: "Focusing",
    onBreak: "On a break",
    ready: "Ready",
    paused: "Paused",
    breakReady: "Break!",
    breakOver: "Break over",
    breakReadyHint: "Focus done, the break is ready.",
    breakOverHint: "Break over, ready to focus.",
    runningHint: "Running",
    pausedHint: "Press Start to continue",
    readyHint: "Pick a session, press Start",
    start: "Start",
    resume: "Resume",
    pause: "Pause",
    reset: "Reset",
    cycle: "Cycle",
    today: "Focus today",
    pFocus: "Focus · 25 min",
    pShort: "Break · 5 min",
    pLong: "Long break · 15 min",
    langTip: "Türkçe / English",
  },
};

const locale = String(
  Intl.DateTimeFormat().resolvedOptions().locale || "en",
).toLowerCase();
let lang = app.load("lang", locale.startsWith("tr") ? "tr" : "en");
if (lang !== "tr" && lang !== "en") lang = "en";
const t = (k) =>
  k === undefined
    ? T[lang]
    : T[lang] && T[lang][k] !== undefined
      ? T[lang][k]
      : T.en[k] !== undefined
        ? T.en[k]
        : k;

// ---- State -------------------------------------------------------------

let tmpImage = null;

async function downloadTemp(imgUrl) {
  const res = await fetch(imgUrl);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const file = path.join(os.tmpdir(), "fenn-game-" + Date.now() + ".jpg");
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

function cleanupTemp() {
  if (tmpImage) {
    try {
      fs.unlinkSync(tmpImage);
    } catch {}
    tmpImage = null;
  }
}

var gameData = {
  name: "Chargement",
  background_image: "",
  image64: null,
};

async function getData() {
  try {
    const response = await fetch(url + "/202" + apikey);
    const data = await response.json();
    return data;
  } catch (error) {
    return { name: "Echec du chargement !" };
  }
}

async function main() {
  gameData.name = "Chargement...";
  const data = await getData();
  if (data) {
    gameData = {
      ...data,
      name: data.name,
      background_image: data.background_image,
    };
    if (data.background_image) {
      try {
        cleanupTemp(); // supprime l'ancienne image
        tmpImage = await downloadTemp(data.background_image);
      } catch (e) {
        app.log("image: " + e.message, "error");
      }
    }
  }
  draw();
}

main();

// ---- Timer (1 s interval only while ticking) ---------------------------

function reset() {
  cleanupTemp();
  main();
  draw();
}

// ---- Drawing -----------------------------------------------------------

function statCell(label, value) {
  return fenn.column(
    [
      fenn.text(label, { size: "small", color: "dim" }),
      fenn.text(value, { size: "title" }),
    ],
    { gap: 0, align: "center" },
  );
}

function pageView() {
  const tt = t();
  return fenn.column(
    [
      fenn.row(
        [
          tmpImage
            ? fenn.image({
                path: tmpImage,
                width: 200,
                height: 200,
                rounding: 8,
              })
            : fenn.spacer(200),

          fenn.column(
            [
              fenn.card(
                [
                  fenn.row(
                    [
                      fenn.column(
                        [
                          fenn.text(gameData.name, {
                            size: "big",
                            bold: true,
                            color: "text",
                          }),
                        ],
                        { gap: 8 },
                      ),
                    ],
                    { gap: 8, align: "center" },
                  ),
                ],
                { padding: 8, gap: 8 },
              ),
              fenn.card(
                [
                  fenn.grid(
                    2,
                    [
                      statCell(tt.cycle, (0 % 4) + " / 4"),
                      statCell(tt.today, String("0")),
                    ],
                    { gap: 8 },
                  ),
                ],
                { padding: 8, gap: 8 },
              ),
              fenn.button("reset", {
                label: tt.reset,
                icon: "arrow-clockwise",
                width: 172,
              }),
            ],
            { gap: 8 },
          ),
        ],
        { gap: 10, align: "center" },
      ),
    ],
    { gap: 8 },
  );
}

function tileView() {
  const tt = t();
  const size = app.tile.size || "wide";
  if (size === "small") {
    return fenn.column(
      [
        fenn.text(note || time, {
          size: "title",
          color: "text",
        }),
      ],
      { align: "center", justify: "center", gap: 0 },
    );
  }

  if (size === "wide") {
    return fenn.row(
      [
        tmpImage
          ? fenn.image({
              path: tmpImage,
              width: 36,
              height: 36,
              rounding: 8,
            })
          : fenn.spacer(36),
        fenn.column(
          [
            fenn.text(gameData.name, {
              size: "small",
              color: "text",
            }),
          ],
          { gap: 0 },
        ),
      ],
      { align: "center", gap: 8 },
    );
  }
  return fenn.column(
    [
      tmpImage
        ? fenn.image({
            path: tmpImage,
            width: 36,
            height: 36,
            rounding: 8,
          })
        : fenn.spacer(36),
      fenn.column(
        [
          fenn.text(gameData.name, {
            size: "small",
            color: "text",
          }),
        ],
        { gap: 0 },
      ),
    ],
    { align: "center", gap: 8 },
  );
}

function draw() {
  try {
    app.setTile(tileView());
    app.setPage(pageView());
  } catch (e) {
    console.error("pomodoro: draw failed: " + String((e && e.stack) || e));
  }
}

// ---- Events ------------------------------------------------------------

function guard(fn) {
  return (...args) => {
    try {
      fn(...args);
    } catch (e) {
      console.error("pomodoro: " + String((e && e.stack) || e));
    }
  };
}

app.on(
  "reset",
  guard(() => reset()),
);
app.on(
  "preset:focus",
  guard(() => setPreset("focus")),
);
app.on(
  "lang",
  guard(() => {
    lang = lang === "tr" ? "en" : "tr";
    app.save("lang", lang);
    draw();
  }),
);

// ---- Lifecycle ---------------------------------------------------------

app.onMessage(
  "theme",
  guard(() => draw()),
);
app.onMessage(
  "page_open",
  guard(() => draw()),
);
app.onMessage(
  "shutdown",
  guard(() => {
    cleanupTemp();
    running = false;
    ensureToday();
  }),
);

draw();
