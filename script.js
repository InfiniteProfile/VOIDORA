"use strict";

const $ = selector => document.querySelector(selector);

const grid = $("#profiles");
const loading = $("#loading");
const loadMoreButton = $("#loadMore");
const searchInput = $("#searchInput");
const jumpInput = $("#jumpInput");

const BATCH_SIZE = 12;
const MAX_CARDS = 48;

let nextId = 1n;
let totalGenerated = 0n;
let busy = false;
let version = 0;
let scrollQueued = false;

const firstNames = [
"Veyron", "Nythera", "Zerath", "Kaelith", "Morvane",
"Aethra", "Vaelor", "Nexira", "Draeven", "Oryx",
"Velmora", "Zyther", "Elaris", "Noctara", "Xavien",
"Ravix", "Thalora", "Zevrik", "Umbrion", "Auralith",
"Kryven", "Serapha", "Duskryn", "Virelia", "Azmora",
"Nythor", "Eryndor", "Solvex", "Mystral", "Vorenth"
];

const lastNames = [
"Voidborne", "Ashveil", "Nightfall", "Crimsonveil",
"Oblivion", "Dreadmoor", "Blackthorn", "Duskwalker",
"Gravesend", "Shadowrift", "Ravencrest", "Ebonhart",
"Starless", "Bloodmoon", "Darkwater", "Frostveil",
"Hollowmere", "Ironshade", "Lostborne", "Nevermore",
"Stormveil", "Thornveil", "Vantablack", "Wraithborn"
];

const roles = [
"Void Architect", "Keeper of Forgotten Worlds",
"Crimson Wanderer", "Silent Observer",
"Architect of Dreams", "Unknown Traveler",
"Shadow Cartographer", "Guardian of the Lost",
"Entity Beyond Time", "Warden of Nothingness",
"Last Star Keeper", "Reality Weaver",
"Observer of Infinity", "Architect of Silence",
"Wanderer Between Worlds"
];

const symbols = [
"V", "Ø", "Ж", "✦", "◈", "◇", "⟡", "△",
"⌘", "◉", "✧", "⬡", "☾", "⊙", "✳", "※"
];

const colors = [
"#e33145", "#d8d8d8", "#bd7d88", "#a8a8a8",
"#b44c5b", "#d4a3aa", "#a1a1b5", "#c9c9c9"
];

function hashText(text) {
let hash = 2166136261;

for (let i = 0; i < text.length; i++) {
hash ^= text.charCodeAt(i);
hash = Math.imul(hash, 16777619);
}

return hash >>> 0;
}

function randomGenerator(seed) {
let state = seed >>> 0;

return function () {
state += 0x6D2B79F5;
let value = state;
value = Math.imul(value ^ (value >>> 15), value | 1);
value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

return ((value ^ (value >>> 14)) >>> 0) / 4294967296;

};
}

function createIdentity(id) {
const random = randomGenerator(hashText(id.toString()));

const choose = array =>
array[Math.floor(random() * array.length)];

return {
id: id.toString(),
name: choose(firstNames) + " " + choose(lastNames),
role: choose(roles),
symbol: choose(symbols),
color: choose(colors)
};
}

function element(tag, className, text) {
const node = document.createElement(tag);
node.className = className;
if (text !== undefined) node.textContent = text;
return node;
}

function createCard(id) {
const data = createIdentity(id);

const card = element("article", "profile");
card.dataset.id = data.id;

const top = element("div", "profile-top");
const avatar = element("div", "avatar", data.symbol);
avatar.style.color = data.color;
avatar.style.borderColor = data.color;

const number = element("span", "id", "#" + data.id);
top.append(avatar, number);

const name = element("h3", "name", data.name);
const role = element("div", "role", data.role);

const bottom = element("div", "profile-bottom");
const label = element("span", "", "IDENTITY DISCOVERED");
const button = element("button", "", "OPEN ↗");

button.type = "button";
button.addEventListener("click", () => openIdentity(id));

bottom.append(label, button);
card.append(top, name, role, bottom);

return card;
}

function updateStats() {
$("#currentId").textContent = "#" + (nextId - 1n).toString();
$("#count").textContent = totalGenerated.toString() + " GENERATED";
}

function renderBatch() {
if (busy) return;

busy = true;
const renderVersion = version;

loading.hidden = false;
loadMoreButton.disabled = true;

const fragment = document.createDocumentFragment();

for (let i = 0; i < BATCH_SIZE; i++) {
fragment.appendChild(createCard(nextId));
nextId++;
}

// Yield to the browser, then append the small batch.
requestAnimationFrame(() => {
if (renderVersion !== version) {
busy = false;
return;
}

grid.appendChild(fragment);
totalGenerated += BigInt(BATCH_SIZE);

// Remove old DOM nodes so memory use remains bounded.
while (grid.children.length > MAX_CARDS) {
  grid.removeChild(grid.firstElementChild);
}

updateStats();

loading.hidden = true;
loadMoreButton.disabled = false;
busy = false;

});
}

function reset(startId = 1n) {
version++;

grid.replaceChildren();
nextId = startId;
totalGenerated = 0n;
busy = false;

window.scrollTo({ top: 0, behavior: "auto" });

renderBatch();
}

function parseId(value) {
const input = value.trim();

if (!/^[0-9]+$/.test(input)) return null;

try {
const id = BigInt(input);
return id >= 1n ? id : null;
} catch {
return null;
}
}

function notify(message) {
let toast = $("#toast");

if (!toast) {
toast = element("div", "", "");
toast.id = "toast";
toast.setAttribute("role", "status");

Object.assign(toast.style, {
  position: "fixed",
  left: "50%",
  bottom: "20px",
  transform: "translateX(-50%)",
  zIndex: "100",
  maxWidth: "90%",
  padding: "14px 18px",
  color: "#e6e6e6",
  background: "#180d10",
  border: "1px solid #e33145",
  fontSize: "12px",
  overflowWrap: "anywhere"
});

document.body.appendChild(toast);

}

toast.textContent = message;
toast.hidden = false;

clearTimeout(notify.timer);
notify.timer = setTimeout(() => {
toast.hidden = true;
}, 3000);
}

function openIdentity(id) {
const data = createIdentity(id);

searchInput.value = id.toString();

const params = new URLSearchParams(location.search);
params.set("profile", id.toString());

history.replaceState(null, "", "?" + params.toString());

notify("IDENTITY #" + data.id + " — " + data.name);
}

function searchIdentity(value) {
const id = parseId(value);

if (id === null) {
notify("Please enter a positive whole-number identity ID.");
return;
}

searchInput.value = id.toString();

const params = new URLSearchParams(location.search);
params.set("profile", id.toString());

history.replaceState(null, "", "?" + params.toString());

reset(id);
}

$("#searchForm").addEventListener("submit", event => {
event.preventDefault();
searchIdentity(searchInput.value);
});

$("#jumpForm").addEventListener("submit", event => {
event.preventDefault();
searchIdentity(jumpInput.value);
});

document.querySelectorAll("[data-id]").forEach(button => {
button.addEventListener("click", () => {
searchIdentity(button.dataset.id);
});
});

// Automatic scrolling: request another batch near the document bottom.
function checkScroll() {
scrollQueued = false;

if (busy) return;

const scrollPosition = window.scrollY + window.innerHeight;
const documentHeight = document.documentElement.scrollHeight;

if (scrollPosition >= documentHeight - 650) {
renderBatch();
}
}

window.addEventListener("scroll", () => {
if (scrollQueued) return;

scrollQueued = true;
requestAnimationFrame(checkScroll);
}, { passive: true });

// The manual fallback always remains available.
loadMoreButton.addEventListener("click", renderBatch);

// Restore a directly linked identity.
const initialParams = new URLSearchParams(location.search);
const initialProfile = initialParams.get("profile");
const initialId = initialProfile === null ? null : parseId(initialProfile);

if (initialId !== null) {
searchInput.value = initialId.toString();
reset(initialId);
} else {
reset(1n);
}
