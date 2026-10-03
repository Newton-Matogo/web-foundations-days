let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  return notes.filter((note) =>
    note.text.toLowerCase().includes(word.toLowerCase()),
  );
}

function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (let note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }

  return longest;
}

function countByCategory() {
  let counts = {
    personal: 0,
    work: 0,
    study: 0,
  };

  for (let note of notes) {
    counts[note.category]++;
  }

  return counts;
}

function getSummary() {
  const counts = countByCategory();
  const word = notes.length === 1 ? "note" : "notes";

  return `${notes.length} ${word}: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;
}

function isDuplicate(text) {
  const normalizedText = text.trim().toLowerCase();

  return notes.some(
    (note) => note.text.trim().toLowerCase() === normalizedText,
  );
}

function addNote(text, category) {
  const trimmedText = text.trim();

  if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log("Note was not added: text must be 1-200 characters.");
    return false;
  }

  if (!["personal", "work", "study"].includes(category)) {
    console.log(
      "Note was not added: category must be personal, work, or study.",
    );
    return false;
  }

  if (isDuplicate(trimmedText)) {
    console.log("Note was not added: duplicate note.");
    return false;
  }

  const newId =
    notes.length > 0 ? Math.max(...notes.map((note) => note.id)) + 1 : 1;

  notes.push({
    id: newId,
    text: trimmedText,
    category: category,
  });

  console.log("Note added successfully.");
  return true;
}

/* TESTS */

// searchNotes
console.log(searchNotes("milk"));
// Expected: [{ id: 1, text: "Buy milk and bread", category: "personal" }]

console.log(searchNotes("pizza"));
// Expected: []

// longestNote
console.log(longestNote());
// Expected: note with id 3

let savedNotes = notes;
notes = [];

console.log(longestNote());
// Expected: null

notes = savedNotes;

// countByCategory
console.log(countByCategory());
// Expected: { personal: 2, work: 1, study: 2 }

savedNotes = notes;
notes = [];

console.log(countByCategory());
// Expected: { personal: 0, work: 0, study: 0 }

notes = savedNotes;

// getSummary
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

savedNotes = notes;
notes = [notes[0]];

console.log(getSummary());
// Expected: "1 note: 1 personal, 0 work, 0 study."

notes = savedNotes;

// isDuplicate
console.log(isDuplicate("BUY MILK AND BREAD"));
// Expected: true

console.log(isDuplicate("Buy pizza"));
// Expected: false

// addNote
console.log(addNote("Finish my JavaScript homework", "study"));
// Expected: true

console.log(addNote("buy milk and bread", "personal"));
// Expected: false

console.log(addNote("This is a note", "invalid"));
// Expected: false

console.log(addNote("", "personal"));
// Expected: false
