import { fetchData } from './services/dataService.js';
import { setupDropdowns } from './services/dropdownService.js';
import { setupEventListeners } from './services/uiService.js';
import { clearAllSelections } from './services/selectionService.js';

const CONTROL_IDS = [
  'platform', 'pythonVersion', 'pytorchVersion', 'computeType', 'computeVersion',
  'includeTorchvision', 'includeTorchaudio', 'includeCPU',
  'clearAllBtn', 'copyConfigBtn', 'copyCommandBtn', 'copyAllBtn', 'downloadBtn',
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

/** Render a fatal error banner, disable controls, and stop app initialization */
function showFatalError(message) {
  disableAllControls();

  const container = document.querySelector('.container-fluid');
  const alert = document.createElement('div');
  alert.className = 'alert alert-danger m-3';
  alert.setAttribute('role', 'alert');
  alert.textContent = message;
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
}
