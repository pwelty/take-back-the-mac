const RIGHTS = [
  {
    id: "real-uninstall",
    title: "Make uninstall mean uninstall",
    body: "When a user removes an app, macOS should remove the bundle, support files, launch agents, login items, caches, preferences, receipts, background helpers, and vendor-created leftovers that came with it.",
  },
  {
    id: "app-footprint",
    title: "Show what every app owns",
    body: "Every app should have a plain, built-in footprint view that shows its bundle, containers, caches, logs, preferences, helpers, receipts, launch items, permissions, and active background processes. If an app created it, the user should be able to see it."
  },
  {
    id: "background-behavior",
    title: "Put background behavior in plain sight",
    body: "Helpers, agents, daemons, updaters, login items, and sync processes should be grouped under the parent app, labeled in plain English, and easy to stop without hunting through system folders. No more mystery processes."
  },
  {
    id: "clean-trials",
    title: "Make app trials clean and reversible",
    body: "Trying an app should not feel like contaminating a machine. macOS should support reversible trials that let users install, test, remove, and restore without becoming unpaid cleanup staff."
  },
  {
    id: "app-store-stewardship",
    title: "Make the App Store earn its control",
    body: "If Apple controls distribution, the store should not be full of scam subscriptions, fake utilities, copycats, dark patterns, junk SEO, and apps designed to confuse people into paying."
  },
  {
    id: "plain-permissions",
    title: "Make permissions user language",
    body: "Permission prompts and settings should say what an app can do, what data it can touch, why it wants access, and whether that access continues after the app is closed.",
  },
  {
    id: "local-ownership",
    title: "Protect local ownership",
    body: "Local files, local settings, and local storage belong to the user. Apps should not be allowed to turn Library folders, containers, and caches into private landfills the owner cannot understand or clean.",
  },
  {
    id: "refuse-cloud-gravity",
    title: "Keep local features local",
    body: "Cloud services should be optional unless the product is explicitly a cloud product. Local workflows should stay local, and core features should not decay into sync nags, storage upsells, or account requirements.",
  },
  {
    id: "more-than-services",
    title: "Build the Mac for owners, not Services revenue",
    body: "A personal computer should not keep steering its owner toward subscriptions, storage nudges, bundles, payment rails, media funnels, and cloud locks. The product is the computer, not the services funnel.",
  },
  {
    id: "inspect-and-reset",
    title: "Answer basic system questions",
    body: "macOS should answer basic ownership questions directly: what installed this, what is running, what starts at login, what has access, what changed recently, and what can be removed safely.",
  },
  {
    id: "treated-as-owner",
    title: "Treat the buyer as the owner",
    body: "Safety should not require infantilization. Simplicity should not mean hiding the mess until the user trips over it. Apple should use its control to serve the person who bought the device.",
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

function icon() {
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M12 5 5 13h4v6h6v-6h4L12 5Z" fill="currentColor"/>
    </svg>
  `;
}

function formatScore(score) {
  return String(score);
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
      </div>
      <div class="vote-box">
        <div class="vote-score" data-score>0</div>
        <button class="vote-button" type="button" data-vote="1" aria-pressed="false" title="Vote up" aria-label="Vote up: ${right.title}">
          ${icon()}
          <span data-up>0</span>
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
            ${icon()}
            <span data-up>${idea.up}</span>
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
  document.body.dataset.status = message;
}

function setIdeaFormStatus(message) {
  ideaFormStatus.textContent = message;
}

function updateSummary() {
}

function updateRightVotes(items) {
  state.rightVotes = new Map(items.map((item) => [item.id, item]));

  for (const right of RIGHTS) {
    const item = state.rightVotes.get(right.id) || { up: 0, score: 0, choice: 0 };
    const card = document.querySelector(`[data-item-id="${right.id}"]`);
    if (!card) continue;

    card.querySelector("[data-score]").textContent = formatScore(item.score);
    card.querySelector("[data-up]").textContent = item.up;

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
  if (value !== 1) return;

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
  if (value !== 1) return;

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
        email: formData.get("email"),
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
