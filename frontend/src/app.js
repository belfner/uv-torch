import { fetchData } from './services/dataService.js';
import { setupDropdowns } from './services/dropdownService.js';
import { setupEventListeners } from './services/uiService.js';
import { clearAllSelections } from './services/selectionService.js';

const CONTROL_IDS = [
  'platform', 'pythonVersion', 'pytorchVersion', 'computeType', 'computeVersion',
  'includeTorchvision', 'includeTorchaudio', 'includeCPU',
  'clearAllBtn', 'copyConfigBtn', 'copyCommandBtn', 'copyAllBtn',
];

const REQUIRED_RELEASE_FIELDS = [
  'version', 'compute_type', 'compute_version', 'python_version', 'platform', 'index_url',
];

/** Disable every interactive control so a half-initialized page is not usable */
function disableAllControls() {
  CONTROL_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el !== null) {
      el.disabled = true;
    }
  });
  document.querySelectorAll('.reset-btn').forEach(btn => {
    btn.disabled = true;
  });
}

/** Controls re-enabled once the catalog has loaded and the UI is wired.
 *  Compute Version, Include CPU, and the copy buttons stay disabled
 *  here; they are governed by their own state logic. */
const LOADED_ENABLED_IDS = [
  'platform', 'pythonVersion', 'pytorchVersion', 'computeType',
  'includeTorchvision', 'includeTorchaudio',
];

/** C2: remove the in-flight loading indicator */
function hideLoadingBanner() {
  const banner = document.getElementById('loadingBanner');
  if (banner !== null) {
    banner.remove();
  }
}

/** C2: re-enable the input controls once the UI is ready. Leaves
 *  state-governed controls (Compute Version, Include CPU, copy,
 *  Clear All) to their own logic. */
function enableLoadedControls() {
  LOADED_ENABLED_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el !== null) {
      el.disabled = false;
    }
  });
  document.querySelectorAll('.reset-btn').forEach(btn => {
    btn.disabled = false;
  });
}

/** Render a fatal error banner with a retry action, disable controls,
 *  and stop app initialization */
function showFatalError(message) {
  disableAllControls();
  hideLoadingBanner();

  const container = document.querySelector('.container-fluid');
  const alert = document.createElement('div');
  alert.className = 'alert alert-danger m-3';
  alert.setAttribute('role', 'alert');

  const text = document.createElement('span');
  text.textContent = message + ' ';
  alert.appendChild(text);

  // C2: a retry action so a transient catalog outage is recoverable
  // without the user knowing to reload manually.
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn btn-sm btn-outline-light ms-2';
  retry.textContent = 'Retry';
  retry.addEventListener('click', () => window.location.reload());
  alert.appendChild(retry);

  if (container !== null) {
    container.prepend(alert);
  } else {
    document.body.prepend(alert);
  }
}

/** True only when every release row carries the required non-empty string fields */
function isValidCatalog(data) {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  if (!Array.isArray(data.all_releases) || data.all_releases.length === 0) {
    return false;
  }
  return data.all_releases.every(release => {
    if (release === null || typeof release !== 'object') {
      return false;
    }
    return REQUIRED_RELEASE_FIELDS.every(field => {
      const value = release[field];
      return typeof value === 'string' && value.length > 0;
    });
  });
}

export default async function initApp() {
  // C2: keep every control disabled while the catalog is in flight; the
  // #loadingBanner communicates the wait. Success re-enables the inputs;
  // failure swaps the banner for a fatal error with a retry action.
  disableAllControls();

  // 1) Load PyTorch metadata
  let data;
  try {
    data = await fetchData(import.meta.env.BASE_URL + 'pytorch_info.json');
  } catch (err) {
    console.error('Failed to load pytorch_info.json:', err);
    showFatalError(
      'Could not load PyTorch release data. The catalog service may be ' +
      'unavailable. Please try again later.'
    );
    return;
  }

  // 2) Validate the catalog shape before building any UI from it
  if (!isValidCatalog(data)) {
    console.error('pytorch_info.json is empty or malformed:', data);
    showFatalError(
      'The PyTorch release catalog is empty or malformed. The catalog ' +
      'service may still be initializing. Please try again later.'
    );
    return;
  }

  // 3) Reset selections now that the DOM is ready (no import-time side effect)
  clearAllSelections();

  // 4) Build all dropdowns with the full dataset
  setupDropdowns(data.all_releases);

  // 5) Wire up all buttons, selects, and checkboxes
  setupEventListeners(data.all_releases);

  // 6) Catalog is ready: drop the loading indicator and re-enable inputs
  hideLoadingBanner();
  enableLoadedControls();
}
