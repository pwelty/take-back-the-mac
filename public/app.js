const RIGHTS = [
  {
    id: "real-uninstall",
    title: "The right to real uninstall",
    body: "Removing an app should remove what the app installed, touched, scheduled, cached, and left behind.",
    ask: "Uninstall means uninstall."
  },
  {
    id: "app-footprint",
    title: "The right to know what an app owns",
    body: "Every app should have a visible footprint: bundle, containers, caches, logs, preferences, helpers, receipts, and background processes.",
    ask: "If an app created it, the user should be able to see it."
  },
  {
    id: "background-behavior",
    title: "The right to honest background behavior",
    body: "Helpers, agents, daemons, updaters, and login items should be grouped under the parent app and named in plain English.",
    ask: "No more mystery processes."
  },
  {
    id: "clean-trials",
    title: "The right to clean trials",
    body: "Trying an app should not feel like contaminating your machine or volunteering for system cleanup.",
    ask: "Install, test, remove, restore."
  },
  {
    id: "app-store-stewardship",
    title: "The right to App Store stewardship",
    body: "If Apple controls distribution, the store should not be a maze of scam subscriptions, fake utilities, knockoffs, and dark patterns.",
    ask: "A controlled platform has to earn its control."
  },
  {
    id: "plain-permissions",
    title: "The right to plain permissions",
    body: "Permissions should say what an app can do, what data it can touch, and whether that access continues in the background.",
    ask: "Security language should be user language."
  },
  {
    id: "local-ownership",
    title: "The right to local ownership",
    body: "Local files belong to the user. Local storage should not become a private landfill for vendors.",
    ask: "The Mac is not vendor territory."
  },
  {
    id: "refuse-cloud-gravity",
    title: "The right to refuse cloud gravity",
    body: "Cloud services should be optional unless the product is explicitly a cloud product.",
    ask: "Local features should work locally."
  },
  {
    id: "more-than-services",
    title: "The right to be more than a Services customer",
    body: "A personal computer should not keep steering its owner toward subscriptions, storage nudges, bundles, payment rails, and cloud locks.",
    ask: "Stop redesigning the device around Services growth."
  },
  {
    id: "inspect-and-reset",
    title: "The right to inspect and reset",
    body: "Users deserve first-class answers to simple questions: what installed this, what is running, what starts at login, what has access, and what can be removed.",
    ask: "User questions deserve user-facing answers."
  },
  {
    id: "treated-as-owner",
    title: "The right to be treated as the owner",
    body: "Safety should not require infantilization. Simplicity should not mean hiding the mess until the user trips over it.",
    ask: "Control should serve the person who bought the device."
  }
];

const state = {
  rightVotes: new Map(),
  ideas: [],
  ideaSort: "top",
  pendingRights: new Set(),
  pendingIdeas: new Set(),
  voterId: getVoterId()
};

const rightsList = document.querySelector("#rights-list");
const ideaList = document.querySelector("#idea-list");
const ideaForm = document.querySelector("#idea-form");
const ideaFormStatus = document.querySelector("#idea-form-status");
const voteStatus = document.querySelector("#vote-status");
const totalScore = document.querySelector("#total-score");
const totalUp = document.querySelector("#total-up");
const ideaCount = document.querySelector("#idea-count");

function getVoterId() {
  const key = "takeBackTheMacVoterId";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const created = crypto.randomUUID().replace(/-/g, "");
  localStorage.setItem(key, created);
  return created;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function icon(kind) {
  const up = kind === "up";
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="${up ? "M12 5 5 13h4v6h6v-6h4L12 5Z" : "M12 19 5 11h4V5h6v6h4l-7 8Z"}" fill="currentColor"/>
    </svg>
  `;
}

function formatScore(score) {
  return score > 0 ? `+${score}` : String(score);
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(value.replace(" ", "T") + "Z"));
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

function renderIdeas() {
  if (!state.ideas.length) {
    ideaList.innerHTML = `
      <div class="empty">
        <strong>No ideas yet.</strong>
        <span>Be the first person to make the complaint useful.</span>
      </div>
    `;
    updateSummary();
    return;
  }

  ideaList.innerHTML = state.ideas.map((idea) => {
    const body = idea.body
      ? `<p>${escapeHTML(idea.body).replaceAll("\n", "<br />")}</p>`
      : "";
    const author = idea.author ? ` by ${escapeHTML(idea.author)}` : "";

    return `
      <article class="idea-card" data-idea-id="${escapeHTML(idea.id)}">
        <div>
          <div class="idea-meta">
            <span>${escapeHTML(idea.category)}</span>
            <span>${escapeHTML(idea.status)}</span>
            <span>${formatDate(idea.createdAt)}${author}</span>
          </div>
          <h3>${escapeHTML(idea.title)}</h3>
          ${body}
        </div>
        <div class="vote-box">
          <div class="vote-score" data-score>${formatScore(idea.score)}</div>
          <button class="vote-button" type="button" data-vote="1" aria-pressed="${idea.choice === 1}" title="Vote up" aria-label="Vote up: ${escapeHTML(idea.title)}">
            ${icon("up")}
            <span data-up>${idea.up}</span>
          </button>
          <button class="vote-button" type="button" data-vote="-1" aria-pressed="${idea.choice === -1}" title="Vote down" aria-label="Vote down: ${escapeHTML(idea.title)}">
            ${icon("down")}
            <span data-down>${idea.down}</span>
          </button>
        </div>
      </article>
    `;
  }).join("");

  for (const idea of state.ideas) {
    const card = document.querySelector(`[data-idea-id="${CSS.escape(idea.id)}"]`);
    if (!card) continue;
    for (const button of card.querySelectorAll(".vote-button")) {
      button.disabled = state.pendingIdeas.has(idea.id);
    }
  }

  updateSummary();
}

function setStatus(message) {
  voteStatus.textContent = message;
}

function setIdeaFormStatus(message) {
  ideaFormStatus.textContent = message;
}

function updateSummary() {
  const rightTotals = [...state.rightVotes.values()].reduce((totals, item) => {
    totals.up += item.up;
    totals.down += item.down;
    totals.score += item.score;
    return totals;
  }, { up: 0, down: 0, score: 0 });

  const ideaTotals = state.ideas.reduce((totals, item) => {
    totals.up += item.up;
    totals.down += item.down;
    totals.score += item.score;
    return totals;
  }, { up: 0, down: 0, score: 0 });

  totalUp.textContent = rightTotals.up + ideaTotals.up;
  totalScore.textContent = formatScore(rightTotals.score + ideaTotals.score);
  ideaCount.textContent = state.ideas.length;
}

function updateRightVotes(items) {
  state.rightVotes = new Map(items.map((item) => [item.id, item]));

  for (const right of RIGHTS) {
    const item = state.rightVotes.get(right.id) || { up: 0, down: 0, score: 0, choice: 0 };
    const card = document.querySelector(`[data-item-id="${right.id}"]`);
    if (!card) continue;

    card.querySelector("[data-score]").textContent = formatScore(item.score);
    card.querySelector("[data-up]").textContent = item.up;
    card.querySelector("[data-down]").textContent = item.down;

    for (const button of card.querySelectorAll(".vote-button")) {
      const buttonValue = Number(button.dataset.vote);
      button.setAttribute("aria-pressed", String(item.choice === buttonValue));
      button.disabled = state.pendingRights.has(right.id);
    }
  }

  updateSummary();
}

function updateIdeaSortButtons() {
  for (const button of document.querySelectorAll("[data-idea-sort]")) {
    button.setAttribute("aria-pressed", String(button.dataset.ideaSort === state.ideaSort));
  }
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
    updateRightVotes(data.items);
    setStatus("The board is live.");
  } catch {
    setStatus("Vote counts are unavailable right now.");
  }
}

async function loadIdeas() {
  try {
    updateIdeaSortButtons();
    const response = await fetch(`/api/ideas?voterId=${encodeURIComponent(state.voterId)}&sort=${state.ideaSort}`, {
      headers: {
        "X-Voter-ID": state.voterId
      }
    });

    if (!response.ok) throw new Error("Ideas API failed");

    const data = await response.json();
    state.ideas = data.ideas;
    renderIdeas();
    setStatus("The board is live.");
  } catch {
    ideaList.innerHTML = `
      <div class="empty">
        <strong>Ideas are unavailable right now.</strong>
        <span>The manifesto still loads. The database is the part being stubborn.</span>
      </div>
    `;
  }
}

async function submitRightVote(itemId, value) {
  state.pendingRights.add(itemId);
  updateRightVotes([...state.rightVotes.values()]);
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
    updateRightVotes(data.items);
    setStatus("Vote saved.");
  } catch {
    setStatus("Vote did not save. Try again.");
  } finally {
    state.pendingRights.delete(itemId);
    updateRightVotes([...state.rightVotes.values()]);
  }
}

async function submitIdeaVote(ideaId, value) {
  state.pendingIdeas.add(ideaId);
  renderIdeas();
  setStatus("Saving idea vote...");

  try {
    const response = await fetch("/api/idea-vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Voter-ID": state.voterId
      },
      body: JSON.stringify({
        ideaId,
        value,
        voterId: state.voterId
      })
    });

    if (!response.ok) throw new Error("Idea vote save failed");

    await loadIdeas();
    setStatus("Idea vote saved.");
  } catch {
    setStatus("Idea vote did not save. Try again.");
  } finally {
    state.pendingIdeas.delete(ideaId);
    renderIdeas();
  }
}

async function submitIdea(event) {
  event.preventDefault();

  const formData = new FormData(ideaForm);
  const submitButton = ideaForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  setIdeaFormStatus("Submitting idea...");

  try {
    const response = await fetch("/api/ideas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Voter-ID": state.voterId
      },
      body: JSON.stringify({
        title: formData.get("title"),
        body: formData.get("body"),
        category: formData.get("category"),
        author: formData.get("author"),
        voterId: state.voterId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Idea did not save.");
    }

    ideaForm.reset();
    state.ideaSort = "new";
    state.ideas = data.ideas;
    renderIdeas();
    updateIdeaSortButtons();
    setIdeaFormStatus("Idea submitted.");
    setStatus("New idea added.");
  } catch (error) {
    setIdeaFormStatus(error.message || "Idea did not save. Try again.");
  } finally {
    submitButton.disabled = false;
  }
}

rightsList.addEventListener("click", (event) => {
  const button = event.target.closest(".vote-button");
  if (!button) return;

  const card = button.closest("[data-item-id]");
  if (!card) return;

  submitRightVote(card.dataset.itemId, Number(button.dataset.vote));
});

ideaList.addEventListener("click", (event) => {
  const button = event.target.closest(".vote-button");
  if (!button) return;

  const card = button.closest("[data-idea-id]");
  if (!card) return;

  submitIdeaVote(card.dataset.ideaId, Number(button.dataset.vote));
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-idea-sort]");
  if (!button) return;

  state.ideaSort = button.dataset.ideaSort;
  loadIdeas();
});

ideaForm.addEventListener("submit", submitIdea);

renderRights();
loadVotes();
loadIdeas();
