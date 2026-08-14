import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const unitCount = 13;
const unitStart = 1001;
const holeCount = 5;
const maintenanceOptions = ['', 'Valves', 'Seats', 'Valves & Seats', 'Packing'];

function createUnits() {
  return Array.from({ length: unitCount }, (_, index) => {
    const unitNumber = unitStart + index;
    return {
      unitNumber,
      date: '',
      pumpHours: '',
      slots: Array.from({ length: holeCount }, (_, slotIndex) => ({
        slotNumber: slotIndex + 1,
        type: '',
      })),
    };
  });
}

function formatDate(dateString) {
  if (!dateString) return 'No date';
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function Home() {
  const [units, setUnits] = useState(createUnits);
  const [selectedUnitNumber, setSelectedUnitNumber] = useState(unitStart);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      const { data, error } = await supabase
        .from('maintenance_history')
        .select('*')
        .eq('unit_number', selectedUnitNumber)
        .order('date', { ascending: false });

      if (!error) {
        setHistory(data || []);
      }
    }

    fetchHistory();

    const channel = supabase
      .channel('maintenance_history_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'maintenance_history',
      }, () => {
        fetchHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUnitNumber]);

  const selectedUnit = units.find((unit) => unit.unitNumber === selectedUnitNumber) || units[0];
  const bulkValvesSeats = selectedUnit.slots.every((slot) => slot.type === 'Valves & Seats');
  const bulkPacking = selectedUnit.slots.every((slot) => slot.type === 'Packing');

  function updateSelectedUnit(updater) {
    setUnits((currentUnits) =>
      currentUnits.map((unit) =>
        unit.unitNumber === selectedUnitNumber ? updater(unit) : unit
      )
    );
  }

  function handleSlotChange(slotNumber, nextValue) {
    updateSelectedUnit((unit) => ({
      ...unit,
      slots: unit.slots.map((slot) =>
        slot.slotNumber === slotNumber ? { ...slot, type: nextValue } : slot
      ),
    }));
  }

  function applyBulkMaintenance(type) {
    updateSelectedUnit((unit) => ({
      ...unit,
      slots: unit.slots.map((slot) => ({ ...slot, type })),
    }));
  }

  async function handleSubmit() {
    if (!selectedUnit.date) {
      window.alert('Please select a date before submitting.');
      return;
    }

    const selectedEntries = selectedUnit.slots.filter((slot) => slot.type);

    if (selectedEntries.length === 0) {
      window.alert('Please choose at least one maintenance type before submitting.');
      return;
    }

    const { error } = await supabase.from('maintenance_history').insert({
      unit_number: selectedUnitNumber,
      slot_number: selectedEntries.map((slot) => slot.slotNumber).join(', '),
      type: selectedEntries.map((slot) => `${slot.slotNumber}: ${slot.type}`).join(', '),
      date: selectedUnit.date,
      pump_hours: selectedUnit.pumpHours || '0',
    });

    if (error) {
      window.alert('Failed to save entry. Please try again.');
      return;
    }

    updateSelectedUnit((unit) => ({
      ...unit,
      slots: unit.slots.map((slot) => ({ ...slot, type: '' })),
    }));
  }

  async function handleDelete(entryId) {
    const { error } = await supabase
      .from('maintenance_history')
      .delete()
      .eq('id', entryId);

    if (error) {
      window.alert('Failed to delete entry. Please try again.');
    }
  }

  function handleAdmin() {
    if (adminUnlocked) {
      setAdminUnlocked(false);
      return;
    }

    const inputPassword = window.prompt('Enter admin password:', '');

    if (inputPassword === '12167401') {
      setAdminUnlocked(true);
      window.alert('Admin access enabled.');
      return;
    }

    if (inputPassword !== null) {
      window.alert('Incorrect password.');
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Units</h1>
        </div>
        <nav id="unitList" className="unit-list" aria-label="Unit list">
          {units.map((unit) => (
            <button
              key={unit.unitNumber}
              type="button"
              className={`unit-item ${unit.unitNumber === selectedUnitNumber ? 'active' : ''}`}
              aria-pressed={unit.unitNumber === selectedUnitNumber}
              onClick={() => setSelectedUnitNumber(unit.unitNumber)}
            >
              Unit {unit.unitNumber}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Maintenance Tracker</p>
            <h2>Unit {selectedUnit.unitNumber}</h2>
          </div>

          <div className="topbar-controls">
            <div className="meta-card">
              <label className="date-field-label" htmlFor="unitDate">
                <span>Date</span>
                <input
                  id="unitDate"
                  type="date"
                  value={selectedUnit.date}
                  onChange={(event) =>
                    updateSelectedUnit((unit) => ({ ...unit, date: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="meta-card">
              <label className="date-field-label" htmlFor="pumpHours">
                <span>Pump Hours</span>
                <input
                  id="pumpHours"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={selectedUnit.pumpHours}
                  onChange={(event) =>
                    updateSelectedUnit((unit) => ({ ...unit, pumpHours: event.target.value }))
                  }
                />
              </label>
            </div>

            <button
              type="button"
              className={`admin-button ${adminUnlocked ? 'active' : ''}`}
              onClick={handleAdmin}
            >
              {adminUnlocked ? 'Admin On' : 'Admin Off'}
            </button>
          </div>
        </header>

        <section className="maintenance-grid-panel">
          <div className="maintenance-grid" aria-live="polite">
            {selectedUnit.slots.map((slot) => (
              <div key={slot.slotNumber} className="maintenance-card">
                <label className="card-label">Hole {slot.slotNumber}</label>
                <select
                  className="card-select"
                  aria-label={`Maintenance type for hole ${slot.slotNumber}`}
                  value={slot.type}
                  onChange={(event) => handleSlotChange(slot.slotNumber, event.target.value)}
                >
                  {maintenanceOptions.map((optionValue) => (
                    <option key={optionValue || 'empty'} value={optionValue}>
                      {optionValue ? optionValue : 'Select maintenance'}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="bulk-controls" aria-label="Bulk maintenance actions">
            <label className="bulk-checkbox">
              <input
                type="checkbox"
                checked={bulkValvesSeats}
                onChange={(event) => {
                  if (event.target.checked) {
                    applyBulkMaintenance('Valves & Seats');
                  }
                }}
              />
              <span>Valves &amp; Seats</span>
            </label>

            <label className="bulk-checkbox">
              <input
                type="checkbox"
                checked={bulkPacking}
                onChange={(event) => {
                  if (event.target.checked) {
                    applyBulkMaintenance('Packing');
                  }
                }}
              />
              <span>All Packing</span>
            </label>
          </div>

          <div className="submit-row">
            <button type="button" className="submit-button" onClick={handleSubmit}>
              Submit
            </button>
          </div>
        </section>

        <section className="report-panel">
          <div className="report-head">
            <h3>Maintenance History</h3>
            <span className="summary-pill">{history.length} recorded maintenance items</span>
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-history">No maintenance recorded yet for this unit.</div>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="history-item compact">
                  <div className="history-entry-summary">
                    <strong>{formatDate(entry.date)}</strong>
                    <span>Pump Hours: {entry.pump_hours || '0'}</span>
                    <span>Holes: {entry.slot_number}</span>
                  </div>
                  <div className="history-date">{entry.type}</div>
                  {adminUnlocked && (
                    <div className="history-actions">
                      <button
                        type="button"
                        className="delete-history-button"
                        onClick={() => handleDelete(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
