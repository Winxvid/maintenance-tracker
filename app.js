const unitCount = 13;
const unitStart = 1001;
const holeCount = 5;
const maintenanceOptions = ["", "Valves", "Seats", "Valves & Seats", "Packing"];

const units = Array.from({ length: unitCount }, (_, index) => {
  const unitNumber = unitStart + index;
  return {
    unitNumber,
    date: "",
    pumpHours: "",
    history: [],
    slots: Array.from({ length: holeCount }, (_, slotIndex) => ({
      slotNumber: slotIndex + 1,
      type: "",
    })),
  };
});

let selectedUnitNumber = unitStart;

const unitListElement = document.getElementById("unitList");
const maintenanceGridElement = document.getElementById("maintenanceGrid");
const unitTitleElement = document.getElementById("unitTitle");
const historyListElement = document.getElementById("historyList");
const historySummaryElement = document.getElementById("historySummary");
const unitDateInput = document.getElementById("unitDate");
const pumpHoursInput = document.getElementById("pumpHours");
const adminButton = document.getElementById("adminButton");
const submitEntryButton = document.getElementById("submitEntryButton");
const bulkValvesSeatsCheckbox = document.getElementById("bulkValvesSeats");
const bulkPackingCheckbox = document.getElementById("bulkPacking");

let adminUnlocked = false;
const adminPassword = "12167401";

function getSelectedUnit() {
  return units.find((unit) => unit.unitNumber === selectedUnitNumber);
}

function syncBulkCheckboxes() {
  const selectedUnit = getSelectedUnit();
  const allValvesSeats = selectedUnit.slots.every((slot) => slot.type === "Valves & Seats");
  const allPacking = selectedUnit.slots.every((slot) => slot.type === "Packing");

  bulkValvesSeatsCheckbox.checked = allValvesSeats;
  bulkPackingCheckbox.checked = allPacking;
}

function applyBulkMaintenance(type) {
  const selectedUnit = getSelectedUnit();

  selectedUnit.slots.forEach((slot) => {
    slot.type = type;
  });

  renderMaintenanceGrid();
  renderHistory();
  syncBulkCheckboxes();
}

function renderUnitList() {
  unitListElement.innerHTML = "";

  units.forEach((unit) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `unit-item ${unit.unitNumber === selectedUnitNumber ? "active" : ""}`;
    button.textContent = `Unit ${unit.unitNumber}`;
    button.setAttribute("aria-pressed", String(unit.unitNumber === selectedUnitNumber));

    button.addEventListener("click", () => {
      selectedUnitNumber = unit.unitNumber;
      render();
    });

    unitListElement.appendChild(button);
  });
}

function renderMaintenanceGrid() {
  const selectedUnit = getSelectedUnit();

  maintenanceGridElement.innerHTML = "";

  selectedUnit.slots.forEach((slot) => {
    const card = document.createElement("div");
    card.className = "maintenance-card";

    const label = document.createElement("label");
    label.className = "card-label";
    label.textContent = `Hole ${slot.slotNumber}`;

    const select = document.createElement("select");
    select.className = "card-select";
    select.setAttribute("aria-label", `Maintenance type for hole ${slot.slotNumber}`);

    maintenanceOptions.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue ? optionValue : "Select maintenance";
      if (optionValue === slot.type) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener("change", (event) => {
      const updatedUnit = getSelectedUnit();
      const selectedSlot = updatedUnit.slots.find((item) => item.slotNumber === slot.slotNumber);
      selectedSlot.type = event.target.value;
      renderHistory();
      syncBulkCheckboxes();
    });

    card.appendChild(label);
    card.appendChild(select);
    maintenanceGridElement.appendChild(card);
  });
}

function getHistoryForUnit(unit) {
  return [...(unit.history || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function submitCurrentEntry() {
  const selectedUnit = getSelectedUnit();

  if (!selectedUnit.date) {
    alert("Please select a date before submitting.");
    return;
  }

  const selectedEntries = selectedUnit.slots.filter((slot) => slot.type);

  if (selectedEntries.length === 0) {
    alert("Please choose at least one maintenance type before submitting.");
    return;
  }

  const submittedDate = selectedUnit.date;
  const submittedPumpHours = selectedUnit.pumpHours || "0";
  const submittedTypes = selectedEntries.map((slot) => `${slot.slotNumber}: ${slot.type}`).join(", ");

  const compactEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    slotNumber: selectedEntries.map((slot) => slot.slotNumber).join(", "),
    type: submittedTypes,
    date: submittedDate,
    pumpHours: submittedPumpHours,
    compact: true,
  };

  selectedUnit.history = [compactEntry, ...selectedUnit.history].sort((a, b) => (a.date < b.date ? 1 : -1));

  selectedUnit.slots.forEach((slot) => {
    slot.type = "";
  });

  bulkValvesSeatsCheckbox.checked = false;
  bulkPackingCheckbox.checked = false;
  renderMaintenanceGrid();
  renderHistory();
}

function renderHistory() {
  const selectedUnit = getSelectedUnit();
  const entries = getHistoryForUnit(selectedUnit);

  unitTitleElement.textContent = `Unit ${selectedUnit.unitNumber}`;
  historySummaryElement.textContent = `${entries.length} recorded maintenance items`;

  if (entries.length === 0) {
    historyListElement.innerHTML = '<div class="empty-history">No maintenance recorded yet for this unit.</div>';
    return;
  }

  historyListElement.innerHTML = "";

  entries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "history-item compact";

    const summary = document.createElement("div");
    summary.className = "history-entry-summary";
    summary.innerHTML = `
      <strong>${formatDate(entry.date)}</strong>
      <span>Pump Hours: ${entry.pumpHours || "0"}</span>
      <span>Holes: ${entry.slotNumber}</span>
    `;

    const detail = document.createElement("div");
    detail.className = "history-date";
    detail.textContent = entry.type;

    const actions = document.createElement("div");
    actions.className = "history-actions";

    if (adminUnlocked) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-history-button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        const currentUnit = getSelectedUnit();
        currentUnit.history = currentUnit.history.filter((historyEntry) => {
          if (historyEntry.id) {
            return historyEntry.id !== entry.id;
          }

          return !(
            historyEntry.slotNumber === entry.slotNumber &&
            historyEntry.date === entry.date &&
            historyEntry.type === entry.type
          );
        });

        renderHistory();
        syncBulkCheckboxes();
      });
      actions.appendChild(deleteButton);
    }

    item.appendChild(summary);
    item.appendChild(detail);
    item.appendChild(actions);
    historyListElement.appendChild(item);
  });
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function render() {
  const selectedUnit = getSelectedUnit();

  unitDateInput.value = selectedUnit.date;
  pumpHoursInput.value = selectedUnit.pumpHours;

  renderUnitList();
  renderMaintenanceGrid();
  renderHistory();
  syncBulkCheckboxes();
}

bulkValvesSeatsCheckbox.addEventListener("change", (event) => {
  if (event.target.checked) {
    bulkPackingCheckbox.checked = false;
    applyBulkMaintenance("Valves & Seats");
  }
});

bulkPackingCheckbox.addEventListener("change", (event) => {
  if (event.target.checked) {
    bulkValvesSeatsCheckbox.checked = false;
    applyBulkMaintenance("Packing");
  }
});

submitEntryButton.addEventListener("click", () => {
  submitCurrentEntry();
});

unitDateInput.addEventListener("input", () => {
  const selectedUnit = getSelectedUnit();
  selectedUnit.date = unitDateInput.value;
  renderHistory();
});

pumpHoursInput.addEventListener("input", () => {
  const selectedUnit = getSelectedUnit();
  selectedUnit.pumpHours = pumpHoursInput.value;
  renderHistory();
});

adminButton.addEventListener("click", () => {
  if (adminUnlocked) {
    adminUnlocked = false;
    adminButton.textContent = "Admin Off";
    adminButton.classList.remove("active");
    renderHistory();
    return;
  }

  const inputPassword = window.prompt("Enter admin password:", "");

  if (inputPassword === adminPassword) {
    adminUnlocked = true;
    adminButton.textContent = "Admin On";
    adminButton.classList.add("active");
    renderHistory();
    alert("Admin access enabled.");
    return;
  }

  if (inputPassword !== null) {
    alert("Incorrect password.");
  }
});

adminButton.textContent = "Admin Off";

render();
