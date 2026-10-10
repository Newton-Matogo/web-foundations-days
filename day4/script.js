const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

const DRAFT_KEY = "notesToolkitDraft";
const THEME_KEY = "notesToolkitTheme";

// Update the character and word counters.
function updateCounts() {
  const text = noteText.value;
  const characters = text.length;

  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  charCount.textContent = `${characters} / 200 characters`;
  wordCount.textContent = `${words} words`;

  charCount.classList.remove("warning", "over");

  if (characters > 200) {
    charCount.classList.add("over");
  } else if (characters > 180) {
    charCount.classList.add("warning");
  }
}

// Save the draft whenever the user types.
noteText.addEventListener("input", function () {
  updateCounts();
  localStorage.setItem(DRAFT_KEY, noteText.value);
});

// Clear the text, reset the counters, and remove the saved draft.
function clearNote() {
  noteText.value = "";
  updateCounts();
  localStorage.removeItem(DRAFT_KEY);
}

clearBtn.addEventListener("click", clearNote);

// Clear the note when Escape is pressed inside the textarea.
noteText.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    clearNote();
  }
});

// Set the theme button's label.
function updateThemeButton() {
  if (document.body.classList.contains("dark")) {
    themeToggle.textContent = "Light mode";
  } else {
    themeToggle.textContent = "Dark mode";
  }
}

// Toggle the theme and save the user's choice.
themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark");

  const theme = document.body.classList.contains("dark") ? "dark" : "light";

  localStorage.setItem(THEME_KEY, theme);
  updateThemeButton();
});

// Restore the saved draft when the page loads.
const savedDraft = localStorage.getItem(DRAFT_KEY);

if (savedDraft !== null) {
  noteText.value = savedDraft;
}

// Restore the saved theme when the page loads.
const savedTheme = localStorage.getItem(THEME_KEY);

if (savedTheme === "dark") {
  document.body.classList.add("dark");
}

// Initialize the counters and button label.
updateCounts();
updateThemeButton();
u;
