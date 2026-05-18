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
    body: "Local files, local settings, and local storage belong to the user. Apps should not be allowed to turn Library folders, containers, caches, or mobile document silos into private landfills. Documents created on iPhone or iPad should remain user-owned, visible in Files, exportable, backed up, and removable without depending on the app that happened to create them.",
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
  }
];

const state = {
  rightVotes: new Map(),
  ideas: [],
  ideaSort: "top",
  pendingRights: new Set(),
  pendingIdeas: new Set(),
  pendingComments: new Set(),
  voterId: getVoterId()
};

const rightsList = document.querySelector("#rights-list");
const ideaList = document.querySelector("#idea-list");
const ideaPanel = document.querySelector("#submitted-demands");
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

function getRightVote(id) {
  return state.rightVotes.get(id) || { up: 0, score: 0, choice: 0 };
}

function renderComments(comments = []) {
  if (!comments.length) return "";

  return `
    <div class="comment-list">
      <h4>Comments</h4>
      ${comments.map((comment) => `
        <article class="comment">
          <p>${escapeHTML(comment.body).replaceAll("\n", "<br />")}</p>
          <span>${formatDate(comment.createdAt)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function renderCommentForm(targetType, targetId, title) {
  const key = `${targetType}:${targetId}`;

  return `
    <details class="comment-panel">
      <summary>Add a comment</summary>
      <form class="comment-form" data-target-type="${escapeHTML(targetType)}" data-target-id="${escapeHTML(targetId)}">
        <label>
          <span>Comment</span>
          <textarea name="body" maxlength="1200" rows="3" required placeholder="Add useful context, evidence, or a sharper version of the request."></textarea>
        </label>
        <label>
          <span>Email optional</span>
          <input name="email" type="email" maxlength="254" autocomplete="email" placeholder="you@example.com" />
        </label>
        <button class="button secondary" type="submit" ${state.pendingComments.has(key) ? "disabled" : ""}>Submit comment</button>
        <p class="status comment-status" data-comment-status aria-live="polite"></p>
      </form>
    </details>
  `;
}

function sortedRights() {
  return RIGHTS.map((right, index) => ({
    ...right,
    index,
    votes: getRightVote(right.id).score
  })).sort((a, b) => b.votes - a.votes || a.index - b.index);
}

function renderRights() {
  rightsList.innerHTML = sortedRights().map((right) => {
    const item = getRightVote(right.id);

    return `
    <article class="right-card" data-item-id="${right.id}">
      <div>
        <h3>${right.title}</h3>
        <p>${right.body}</p>
        ${renderComments(item.comments)}
        ${renderCommentForm("right", right.id, right.title)}
      </div>
      <div class="vote-box">
        <div class="vote-score" data-score>${formatScore(item.score)}</div>
        <button class="vote-button" type="button" data-vote="1" aria-pressed="${item.choice === 1}" title="Vote up" aria-label="Vote up: ${right.title}" ${state.pendingRights.has(right.id) ? "disabled" : ""}>
          ${icon()}
          <span data-up>${item.up}</span>
        </button>
      </div>
    </article>
  `;
  }).join("");
}

function renderIdeas() {
  if (!state.ideas.length) {
    ideaPanel.hidden = true;
    ideaList.innerHTML = "";
    updateSummary();
    return;
  }

  ideaPanel.hidden = false;
  ideaList.innerHTML = state.ideas.map((idea) => {
    const body = idea.body
      ? `<p>${escapeHTML(idea.body).replaceAll("\n", "<br />")}</p>`
      : "";

    return `
      <article class="idea-card" data-idea-id="${escapeHTML(idea.id)}">
        <div>
          <div class="idea-meta">
            <span>${formatDate(idea.createdAt)}</span>
          </div>
          <h3>${escapeHTML(idea.title)}</h3>
          ${body}
          ${renderComments(idea.comments)}
          ${renderCommentForm("idea", idea.id, idea.title)}
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
  renderRights();
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
        <strong>Requests are unavailable right now.</strong>
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
  setStatus("Saving request vote...");

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

    if (!response.ok) throw new Error("Request vote save failed");

    await loadIdeas();
    setStatus("Request vote saved.");
  } catch {
    setStatus("Request vote did not save. Try again.");
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
  setIdeaFormStatus("Submitting request...");

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
        email: formData.get("email"),
        voterId: state.voterId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request did not save.");
    }

    ideaForm.reset();
    state.ideaSort = "new";
    state.ideas = data.ideas;
    renderIdeas();
    updateIdeaSortButtons();
    setIdeaFormStatus(data.message || "Request submitted for review.");
    setStatus("Request submitted for review.");
  } catch (error) {
    setIdeaFormStatus(error.message || "Request did not save. Try again.");
  } finally {
    submitButton.disabled = false;
  }
}

async function submitComment(event) {
  const form = event.target.closest(".comment-form");
  if (!form) return;

  event.preventDefault();

  const targetType = form.dataset.targetType;
  const targetId = form.dataset.targetId;
  const key = `${targetType}:${targetId}`;
  const formData = new FormData(form);
  const submitButton = form.querySelector("button[type='submit']");
  const status = form.querySelector("[data-comment-status]");

  submitButton.disabled = true;
  state.pendingComments.add(key);
  status.textContent = "Submitting comment...";

  try {
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Voter-ID": state.voterId
      },
      body: JSON.stringify({
        targetType,
        targetId,
        body: formData.get("body"),
        email: formData.get("email"),
        voterId: state.voterId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Comment did not save.");
    }

    form.reset();
    status.textContent = data.message || "Comment submitted for review.";
  } catch (error) {
    status.textContent = error.message || "Comment did not save. Try again.";
  } finally {
    state.pendingComments.delete(key);
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
document.addEventListener("submit", submitComment);

renderRights();
loadVotes();
loadIdeas();
