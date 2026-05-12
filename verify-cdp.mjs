const endpoint = "http://127.0.0.1:9231";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connect() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const pages = await fetch(`${endpoint}/json/list`).then((response) => response.json());
      const page = pages.find((entry) => entry.type === "page");
      if (page?.webSocketDebuggerUrl) {
        return new WebSocket(page.webSocketDebuggerUrl);
      }
    } catch {
      await delay(125);
    }
  }

  throw new Error("Chrome CDP endpoint did not become available.");
}

const socket = await connect();
let nextId = 1;
const callbacks = new Map();

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && callbacks.has(message.id)) {
    callbacks.get(message.id)(message);
    callbacks.delete(message.id);
  }
});

await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));

function send(method, params = {}) {
  const id = nextId;
  nextId += 1;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    callbacks.set(id, (message) => {
      if (message.error) {
        reject(new Error(message.error.message));
        return;
      }
      resolve(message.result);
    });
  });
}

async function evaluate(expression, awaitPromise = false) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  return result.result.value;
}

async function runViewport(label, width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: label === "mobile" ? 3 : 1,
    mobile: label === "mobile",
  });
  await send("Page.navigate", { url: "http://127.0.0.1:8000" });
  await delay(1000);

  const metrics = await evaluate(
    `new Promise((resolve) => {
      document.querySelector("#windowModeBtn").click();
      requestAnimationFrame(() => {
        const button = document.querySelector(".window-card:not(.open) .window-button");
        button.click();
        setTimeout(() => {
          const canvas = document.querySelector(".shutter-webgl canvas");
          const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
          const samples = [];
          if (gl && canvas.width && canvas.height) {
            [[0.24, 0.5], [0.38, 0.5], [0.62, 0.5], [0.76, 0.5], [0.5, 0.28], [0.5, 0.72]].forEach(([x, y]) => {
              const pixel = new Uint8Array(4);
              gl.readPixels(Math.floor(canvas.width * x), Math.floor(canvas.height * y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
              samples.push(Array.from(pixel).reduce((sum, value) => sum + value, 0));
            });
          }
          resolve({
            cards: document.querySelectorAll(".window-card").length,
            canvasWidth: canvas?.width || 0,
            canvasHeight: canvas?.height || 0,
            pixelSum: samples.reduce((sum, value) => sum + value, 0),
            panes: getComputedStyle(document.querySelector(".window-scene"), "::after").backgroundImage,
          });
        }, 230);
      });
    })`,
    true,
  );

  return metrics;
}

await send("Page.enable");
await send("Runtime.enable");

const mobile = await runViewport("mobile", 390, 844);
const desktop = await runViewport("desktop", 900, 1100);

console.log(JSON.stringify({ mobile, desktop }, null, 2));
socket.close();
