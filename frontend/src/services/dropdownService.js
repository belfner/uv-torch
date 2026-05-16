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
    populate(selectEl, unique[key] || []);
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
    populate(selectEl, opts, /* preserveValue= */ true);
  });
}

/** Helper: fill a <select> with options */
function populate(selectEl, options, preserveValue = false) {
  const current = selectEl.value;
  selectEl.innerHTML = `<option value="">Select...</option>`;
  options.forEach(opt => {
    const option = new Option(opt, opt);
    selectEl.add(option);
  });
  if (preserveValue && options.includes(current)) {
    selectEl.value = current;
  }
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
