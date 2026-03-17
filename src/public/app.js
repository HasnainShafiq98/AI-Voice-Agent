const state = {
  sessionId: null
};

const sessionBadge = document.getElementById("sessionBadge");
const resultBox = document.getElementById("resultBox");
const player = document.getElementById("player");

function renderSession() {
  sessionBadge.textContent = state.sessionId ? `Session: ${state.sessionId}` : "Session: not started";
}

async function createSession() {
  const response = await fetch("/api/session", { method: "POST" });
  const payload = await response.json();
  state.sessionId = payload.sessionId;
  renderSession();
}

async function endSession() {
  if (!state.sessionId) {
    return;
  }

  await fetch("/api/session/end", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: state.sessionId })
  });

  state.sessionId = null;
  renderSession();
}

async function runTurn(file) {
  if (!state.sessionId) {
    await createSession();
  }

  const data = new FormData();
  data.append("sessionId", state.sessionId);
  data.append("audio", file);

  const response = await fetch("/api/turn", {
    method: "POST",
    body: data
  });

  const payload = await response.json();
  resultBox.textContent = JSON.stringify(payload, null, 2);

  if (payload?.tts?.streamUrl) {
    player.src = payload.tts.streamUrl;
  }
}

document.getElementById("newSession").addEventListener("click", async () => {
  await createSession();
});

document.getElementById("endSession").addEventListener("click", async () => {
  await endSession();
});

document.getElementById("turnForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("audioInput");
  const file = input.files?.[0];

  if (!file) {
    alert("Please select an audio file.");
    return;
  }

  resultBox.textContent = "Processing...";

  try {
    await runTurn(file);
  } catch (error) {
    resultBox.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
});

renderSession();
