const RIGHTS = [
  {
    id: "real-uninstall",
    title: "The Right To Real Uninstall",
    body: "Removing an app should remove what the app installed, touched, scheduled, cached, and left behind.",
    ask: "Uninstall means uninstall."
  },
  {
    id: "app-footprint",
    title: "The Right To Know What An App Owns",
    body: "Every app should have a visible footprint: bundle, containers, caches, logs, preferences, helpers, receipts, and background processes.",
    ask: "If an app created it, the user should be able to see it."
  },
  {
    id: "background-behavior",
    title: "The Right To Honest Background Behavior",
    body: "Helpers, agents, daemons, updaters, and login items should be grouped under the parent app and named in plain English.",
    ask: "No more mystery processes."
  },
  {
    id: "clean-trials",
    title: "The Right To Clean Trials",
    body: "Trying an app should not feel like contaminating your machine or volunteering for system cleanup.",
    ask: "Install, test, remove, restore."
  },
  {
    id: "app-store-stewardship",
    title: "The Right To App Store Stewardship",
    body: "If Apple controls distribution, the store should not be a maze of scam subscriptions, fake utilities, knockoffs, and dark patterns.",
    ask: "A controlled platform has to earn its control."
  },
  {
    id: "plain-permissions",
    title: "The Right To Plain Permissions",
    body: "Permissions should say what an app can do, what data it can touch, and whether that access continues in the background.",
    ask: "Security language should be user language."
  },
  {
    id: "local-ownership",
    title: "The Right To Local Ownership",
    body: "Local files belong to the user. Local storage should not become a private landfill for vendors.",
    ask: "The Mac is not vendor territory."
  },
  {
    id: "refuse-cloud-gravity",
    title: "The Right To Refuse Cloud Gravity",
    body: "Cloud services should be optional unless the product is explicitly a cloud product.",
    ask: "Local features should work locally."
  },
  {
    id: "more-than-services",
    title: "The Right To Be More Than A Services Customer",
    body: "A personal computer should not keep steering its owner toward subscriptions, storage nudges, bundles, payment rails, and cloud locks.",
    ask: "Stop redesigning the device around Services growth."
  },
  {
    id: "inspect-and-reset",
    title: "The Right To Inspect And Reset",
    body: "Users deserve first-class answers to simple questions: what installed this, what is running, what starts at login, what has access, and what can be removed.",
    ask: "User questions deserve user-facing answers."
  },
  {
    id: "treated-as-owner",
    title: "The Right To Be Treated As The Owner",
    body: "Safety should not require infantilization. Simplicity should not mean hiding the mess until the user trips over it.",
    ask: "Control should serve the person who bought the device."
  }
];

const state = {
  votes: new Map(),
  pending: new Set(),
  voterId: getVoterId()
};

const rightsList = document.querySelector("#rights-list");
const voteStatus = document.querySelector("#vote-status");
const totalScore = document.querySelector("#total-score");
const totalUp = document.querySelector("#total-up");
const totalDown = document.querySelector("#total-down");

function getVoterId() {
  const key = "takeBackTheMacVoterId";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const created = crypto.randomUUID().replace(/-/g, "");
  localStorage.setItem(key, created);
  return created;
}

function icon(kind) {
  const up = kind === "up";
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="${up ? "M12 5 5 13h4v6h6v-6h4L12 5Z" : "M12 19 5 11h4V5h6v6h4l-7 8Z"}" fill="currentColor"/>
    </svg>
  `;
}

function renderRights() {
  rightsList.innerHTML = RIGHTS.map((right) => `
    <article class="right-card" data-item-id="${right.id}">
      <div>
        <h3>${right.title}</h3>
        <p>${right.body}</p>
        <p class="ask">${right.ask}</p>
      </div>
      <div class="vote-box">
        <div class="vote-score" data-score>0</div>
        <button class="vote-button" type="button" data-vote="1" aria-pressed="false" title="Vote up" aria-label="Vote up: ${right.title}">
          ${icon("up")}
          <span data-up>0</span>
        </button>
        <button class="vote-button" type="button" data-vote="-1" aria-pressed="false" title="Vote down" aria-label="Vote down: ${right.title}">
          ${icon("down")}
          <span data-down>0</span>
        </button>
      </div>
    </article>
  `).join("");
}

function setStatus(message) {
  voteStatus.textContent = message;
}

function updateVotes(items) {
  state.votes = new Map(items.map((item) => [item.id, item]));

  let up = 0;
  let down = 0;

  for (const right of RIGHTS) {
    const item = state.votes.get(right.id) || { up: 0, down: 0, score: 0, choice: 0 };
    up += item.up;
    down += item.down;

    const card = document.querySelector(`[data-item-id="${right.id}"]`);
    if (!card) continue;

    card.querySelector("[data-score]").textContent = formatScore(item.score);
    card.querySelector("[data-up]").textContent = item.up;
    card.querySelector("[data-down]").textContent = item.down;

    const buttons = card.querySelectorAll(".vote-button");
    for (const button of buttons) {
      const buttonValue = Number(button.dataset.vote);
      button.setAttribute("aria-pressed", String(item.choice === buttonValue));
      button.disabled = state.pending.has(right.id);
    }
  }

  totalUp.textContent = up;
  totalDown.textContent = down;
  totalScore.textContent = formatScore(up - down);
}

function formatScore(score) {
  return score > 0 ? `+${score}` : String(score);
}

async function loadVotes() {
  try {
    const response = await fetch(`/api/votes?voterId=${encodeURIComponent(state.voterId)}`, {
      headers: {
        "X-Voter-ID": state.voterId
      }
    });

    if (!response.ok) throw new Error("Vote API failed");

    const data = await response.json();
    updateVotes(data.items);
    setStatus("Vote counts are live.");
  } catch {
    setStatus("Vote counts are unavailable right now.");
  }
}

async function submitVote(itemId, value) {
  state.pending.add(itemId);
  updateVotes([...state.votes.values()]);
  setStatus("Saving vote...");

  try {
    const response = await fetch("/api/votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Voter-ID": state.voterId
      },
      body: JSON.stringify({
        itemId,
        value,
        voterId: state.voterId
      })
    });

    if (!response.ok) throw new Error("Vote save failed");

    const data = await response.json();
    updateVotes(data.items);
    setStatus("Vote saved.");
  } catch {
    setStatus("Vote did not save. Try again.");
  } finally {
    state.pending.delete(itemId);
    updateVotes([...state.votes.values()]);
  }
}

rightsList.addEventListener("click", (event) => {
  const button = event.target.closest(".vote-button");
  if (!button) return;

  const card = button.closest("[data-item-id]");
  if (!card) return;

  submitVote(card.dataset.itemId, Number(button.dataset.vote));
});

renderRights();
loadVotes();
