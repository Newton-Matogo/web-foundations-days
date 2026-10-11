const loadButton = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const status = document.getElementById("status");
const usersList = document.getElementById("users-list");

let users = [];

function renderUsers(list) {
  usersList.replaceChildren();

  if (list.length === 0) {
    status.textContent = "No users match your filter.";
    return;
  }

  list.forEach((user) => {
    const li = document.createElement("li");
    const name = document.createElement("h2");
    const email = document.createElement("p");
    const city = document.createElement("p");
    const company = document.createElement("p");

    name.textContent = user.name;
    email.textContent = `Email: ${user.email}`;
    city.textContent = `City: ${user.address.city}`;
    company.textContent = `Company: ${user.company.name}`;

    li.append(name, email, city, company);
    usersList.appendChild(li);
  });
}

async function loadUsers() {
  loadButton.disabled = true;
  status.textContent = "Loading users...";
  usersList.replaceChildren();

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    users = await response.json();

    const query = filterInput.value.trim().toLowerCase();
    const filteredUsers = users.filter((user) =>
      user.name.toLowerCase().includes(query),
    );

    renderUsers(filteredUsers);

    if (filteredUsers.length > 0) {
      status.textContent = `Loaded ${filteredUsers.length} user(s).`;
    }
  } catch (error) {
    console.error("Error loading users:", error);
    users = [];
    usersList.replaceChildren();
    status.textContent = "Error loading users. Please try again.";
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadUsers);

filterInput.addEventListener("input", () => {
  const query = filterInput.value.trim().toLowerCase();

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(query),
  );

  renderUsers(filteredUsers);

  if (filteredUsers.length > 0) {
    status.textContent = `Showing ${filteredUsers.length} user(s).`;
  }
});
