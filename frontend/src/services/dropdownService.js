// Manages populating and refreshing <select> elements based on available packages
import { getUniqueValues, getFilteredPackages } from '../utils/index.js';
import { selections } from './selectionService.js';

const DROPDOWN_IDS = ['platform','pythonVersion','pytorchVersion','computeType','computeVersion'];

/** Initial population of all dropdowns */
export function setupDropdowns(allReleases) {
  // Store full data globally for easy access
  window.__allReleases = allReleases;

  // Get unique values for each field
  const unique = getUniqueValues(allReleases);

  // Populate each dropdown
  DROPDOWN_IDS.forEach(id => {
    const selectEl = document.getElementById(id);
    const key = mapKey(id);
    const opts = unique[key] || [];
    populate(selectEl, opts);
    updateMeta(selectEl, opts.length, false);
  });

  // Initially disable compute version
  document.getElementById('computeVersion').disabled = true;
}

/** Refresh all dropdowns after a selection change */
export function refreshDropdowns() {
  DROPDOWN_IDS.forEach(id => {
    const selectEl = document.getElementById(id);
    const key      = mapKey(id);

    // If we're populating the computeType dropdown, ignore any computeVersion selection
    let filterSelections = selections;
    if (id === 'computeType') {
      filterSelections = { ...selections };
      delete filterSelections.computeVersion;
    }

    // Filter packages by everything except this dropdown’s own field
    const pkgs = getFilteredPackages(
      window.__allReleases,
      filterSelections,
      id
    );

    // Then populate
    const opts = getUniqueValues(pkgs)[key] || [];
    const dropped = populate(selectEl, opts, /* preserveValue= */ true);
    updateMeta(selectEl, opts.length, dropped);
  });
}

/**
 * Helper: fill a <select> with options.
 *
 * C3: keeps the field-specific placeholder (from data-placeholder) instead
 * of the generic "Select...". Returns true when a previously selected,
 * non-empty value was dropped because it is no longer compatible.
 */
function populate(selectEl, options, preserveValue = false) {
  const current = selectEl.value;
  const placeholder = selectEl.dataset.placeholder || 'Select...';
  selectEl.innerHTML = '';
  selectEl.add(new Option(placeholder, ''));
  options.forEach(opt => {
    selectEl.add(new Option(opt, opt));
  });

  let dropped = false;
  if (preserveValue) {
    if (options.includes(current)) {
      selectEl.value = current;
    } else if (current !== '') {
      dropped = true;
    }
  }
  return dropped;
}

/** C3: ensure a single inline meta line exists right after the select */
function ensureMeta(selectEl) {
  const next = selectEl.nextElementSibling;
  if (next !== null && next.classList.contains('dropdown-meta')) {
    return next;
  }
  const meta = document.createElement('small');
  meta.className = 'dropdown-meta form-text d-block';
  selectEl.insertAdjacentElement('afterend', meta);
  return meta;
}

/**
 * C3: show a compatibility-count hint, or a restrained inline notice when
 * the prior choice was auto-cleared. Deliberately not a toast - filtering
 * happens on every change and would otherwise produce a toast storm.
 */
function updateMeta(selectEl, count, dropped) {
  const meta = ensureMeta(selectEl);

  // The Compute Version count is only meaningful once a GPU compute type
  // (CUDA / ROCm) is chosen. For an empty/CPU/XPU type the field is
  // disabled, so this single line carries the reason instead of a count.
  if (selectEl.id === 'computeVersion') {
    const computeType = document.getElementById('computeType').value;
    const contextText = {
      '': 'Choose CUDA or ROCm first',
      CPU: 'Not needed for CPU',
      XPU: 'Not configurable for XPU'
    }[computeType];
    if (contextText !== undefined) {
      meta.textContent = contextText;
      meta.classList.remove('text-warning');
      meta.classList.add('text-muted');
      return;
    }
  }

  if (dropped) {
    meta.textContent = 'Previous choice is no longer compatible - selection cleared.';
    meta.classList.remove('text-muted');
    meta.classList.add('text-warning');
    return;
  }
  meta.textContent = count === 0
    ? 'No options compatible with the current selection'
    : `${count} compatible option${count === 1 ? '' : 's'}`;
  meta.classList.remove('text-warning');
  meta.classList.add('text-muted');
}

/** Map DOM id to data key in package objects */
function mapKey(id) {
  return {
    platform:        'platform',
    pythonVersion:   'python_version',
    pytorchVersion:  'version',
    computeType:     'compute_type',
    computeVersion:  'compute_version'
  }[id];
}
