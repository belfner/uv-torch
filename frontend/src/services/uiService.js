// Handles DOM events, toasts, copy, and wiring selection changes
import * as bootstrap from 'bootstrap';
import { updateSelectionsFromDOM, selections } from './selectionService.js';
import { refreshDropdowns } from './dropdownService.js';
import { maybeAutoGenerate } from './generatorService.js';


const toastEl = document.getElementById('notificationToast');
const toast = new bootstrap.Toast(toastEl);

export function setupEventListeners(allReleases) {
    // Dropdown change handlers
    ['platform', 'pythonVersion', 'pytorchVersion', 'computeVersion', 'includeTorchvision', 'includeTorchaudio', 'includeCPU']
        .forEach(id => {
            document.getElementById(id)
                .addEventListener('change', onSelectionChange);
        });

    // Compute Type has special handler
    document.getElementById('computeType').addEventListener('change', onComputeTypeChange)

    // Clear all button
    document.getElementById('clearAllBtn')
        .addEventListener('click', async () => {
            const mod = await import('./selectionService.js');
            mod.clearAllSelections();
            refreshDropdowns();
            // Clear All empties computeType, so re-normalize the dependent
            // controls (Compute Version / Include CPU) on this path too.
            normalizeComputeControls();
            maybeAutoGenerate();
            updateSelectionsSummary();
            updateComputeControlsHelp();
            updateResetAndClearState();
            showNotification('All selections cleared', 'info');
        });

    document.querySelectorAll('.reset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const field = e.currentTarget
            resetField(field)
        })
    })

    // Copy buttons
    document.getElementById('copyConfigBtn')
        .addEventListener('click', (e) => copyText('configOutput', e.currentTarget));
    document.getElementById('copyCommandBtn')
        .addEventListener('click', (e) => copyText('commandOutput', e.currentTarget));
    document.getElementById('copyAllBtn')
        .addEventListener('click', (e) => copyAll(e.currentTarget));

    // C4: seed the compute helper text for the initial (empty) state
    updateComputeControlsHelp();
    // D4: seed per-field Reset visibility and the Clear All enabled state
    updateResetAndClearState();
}

/**
 * Single source of truth for the enabled/cleared state of the
 * compute-dependent controls. Compute Version applies only to a specific
 * GPU compute type; Include CPU applies only alongside a non-CPU build.
 * Every path that can change the compute type (direct change, per-field
 * Reset, Clear All) calls this so the controls and their helper text can
 * never disagree.
 */
function normalizeComputeControls() {
    const computeType = document.getElementById('computeType').value
    const computeVersionElement = document.getElementById('computeVersion')
    const includeCPUElement = document.getElementById('includeCPU')

    if (computeType === '' || computeType === 'CPU' || computeType === 'XPU') {
        computeVersionElement.disabled = true
        computeVersionElement.value = ''
        delete selections.computeVersion
    } else {
        computeVersionElement.disabled = false
    }

    if (computeType === '' || computeType === 'CPU') {
        includeCPUElement.checked = false
        includeCPUElement.disabled = true
    } else {
        includeCPUElement.disabled = false
    }
}

function onComputeTypeChange() {
    normalizeComputeControls()
    // A genuine compute-type change invalidates any prior compute-version
    // pick; clear it so the user reselects against the new type.
    const computeVersionElement = document.getElementById('computeVersion')
    if (!computeVersionElement.disabled) {
        computeVersionElement.value = ''
    }

    onSelectionChange();
}

/**
 * C4: keep the Include CPU helper text in sync with why the control is
 * enabled or disabled. The Compute Version line is the dropdown count
 * meta itself (see dropdownService.updateMeta).
 */
function updateComputeControlsHelp() {
    const computeType = document.getElementById('computeType').value;
    const cpuHelp = document.getElementById('includeCPUHelp');

    let cpuText;
    if (computeType === '') {
        cpuText = 'Select a GPU compute type to add a CPU fallback';
    } else if (computeType === 'CPU') {
        cpuText = 'Configuration is already CPU-only';
    } else if (computeType === 'XPU') {
        cpuText = 'Adds a CPU-only fallback build alongside XPU';
    } else {
        cpuText = 'Also include a CPU-only fallback build';
    }

    if (cpuHelp !== null) {
        cpuHelp.textContent = cpuText;
    }
}

function resetField(buttonEl) {
    const fieldName = buttonEl.dataset.field;
    delete selections[fieldName];

    const control = document.getElementById(fieldName);
    if (control) {
        control.value = '';
    }

    if (fieldName === 'computeType') {
        // Chunk-3 fix: resetting Compute Type must also disable/clear
        // Compute Version and Include CPU, exactly like a direct change,
        // so the controls match the (now empty) helper text.
        normalizeComputeControls();
    }

    onSelectionChange();
}

function onSelectionChange() {
    updateSelectionsFromDOM();
    refreshDropdowns();
    // refreshDropdowns may clear a now-invalid select value in the DOM; re-read
    // so selections does not carry stale state into the summary or generation
    updateSelectionsFromDOM();
    updateSelectionsSummary();
    // C4: keep compute helper text in sync on every path that reaches here
    // (direct change, per-field Reset), not just direct computeType change
    updateComputeControlsHelp();
    // D4: per-field Reset visibility and Clear All enabled state track
    // the current selection on every change path
    updateResetAndClearState();
    maybeAutoGenerate();
}

/**
 * D4: a per-field Reset is only meaningful once that field has a value,
 * and Clear All is only meaningful once the form is non-default. Hide the
 * Reset buttons for empty fields and disable Clear All on a pristine form
 * so neither affordance invites a no-op.
 */
function updateResetAndClearState() {
    let anyNonDefault = false;

    document.querySelectorAll('.reset-btn').forEach(btn => {
        const field = btn.dataset.field;
        const control = document.getElementById(field);
        const hasValue = control !== null && control.value !== '';
        btn.hidden = !hasValue;
        if (hasValue) {
            anyNonDefault = true;
        }
    });

    ['includeTorchvision', 'includeTorchaudio', 'includeCPU'].forEach(id => {
        const el = document.getElementById(id);
        if (el !== null && el.checked) {
            anyNonDefault = true;
        }
    });

    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn !== null) {
        clearAllBtn.disabled = !anyNonDefault;
    }
}

/** Show a Bootstrap toast */
export function showNotification(msg, type = 'info') {
    toastEl.querySelector('.toast-body').textContent = msg;
    toastEl.className = `toast align-items-center text-white bg-${type}`;
    toast.show();
}


/**
 * D3: briefly swap a copy button to a "Copied" check state, then restore
 * its original markup. The toast / polite region still fires for assistive
 * tech; this is the in-place visual confirmation.
 */
function flashCopied(btn) {
    if (btn === null || btn === undefined || btn.dataset.flashing === 'true') {
        return;
    }
    const original = btn.innerHTML;
    btn.dataset.flashing = 'true';
    btn.innerHTML = '<i class="bi bi-check-lg me-1" aria-hidden="true"></i>Copied';
    setTimeout(() => {
        btn.innerHTML = original;
        delete btn.dataset.flashing;
    }, 1500);
}

/** Copy text content of an element to clipboard */
async function copyText(elId, btn = null) {
    const el = document.getElementById(elId);
    if (!el) {
        console.error(`Element with id "${elId}" not found.`);
        return;
    }

    const text = el.textContent;
    if (text.length === 0) {
        showNotification('No text to copy', 'info');
        return
    }

    if (navigator.clipboard !== undefined) {
        try {
            await navigator.clipboard.writeText(text);
            flashCopied(btn);
            showNotification('Copied to clipboard', 'success');
            return
        } catch (err) {
            console.error('Clipboard write failed:', err);
        }
    }

    // Fallback: select the element's text so the user can press Ctrl+C (or ⌘+C) manually
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);

    showNotification('Text selected. Press Ctrl+C (or ⌘+C) to copy.', 'info');

}

/** Copy both TOML & command */
async function copyAll(btn = null) {
    const tomlEl = document.getElementById('configOutput');
    const cmdEl = document.getElementById('commandOutput');
    const toml = tomlEl.textContent;
    const cmd = cmdEl.textContent;
    if (toml.length === 0) {
        showNotification('No text to copy', 'info');
        return
    }

    const combined = toml + '\n\n' + cmd;

    if (navigator.clipboard !== undefined) {
        try {
            await navigator.clipboard.writeText(combined);
            flashCopied(btn);
            showNotification('All copied', 'success');
            return
        } catch (err) {
            console.error('Clipboard write failed:', err);
        }
    }

    // Fallback: copy the combined TOML + command via a temporary textarea so
    // both sections are included even without the Clipboard API
    const scratch = document.createElement('textarea');
    scratch.value = combined;
    scratch.setAttribute('readonly', '');
    scratch.style.position = 'absolute';
    scratch.style.left = '-9999px';
    document.body.appendChild(scratch);
    scratch.select();

    let copied = false;
    try {
        copied = document.execCommand('copy');
    } catch (err) {
        console.error('execCommand copy failed:', err);
    }
    document.body.removeChild(scratch);

    if (copied) {
        flashCopied(btn);
        showNotification('All copied', 'success');
        return
    }

    // Last resort: select the visible config block and ask for a manual copy
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(tomlEl);
    selection.removeAllRanges();
    selection.addRange(range);

    showNotification('Press Ctrl+C (or ⌘+C) to copy the selected config.', 'info');
}

function updateSelectionsSummary() {
    const summary = document.getElementById('selectionsSummary')
    const includeCPU = document.getElementById('includeCPU').checked

    const extras = []
    if (document.getElementById('includeTorchvision').checked) extras.push('torchvision')
    if (document.getElementById('includeTorchaudio').checked) extras.push('torchaudio')

    // The package toggles are real selections even with no dropdown picks,
    // so the empty state must account for them too.
    if (Object.keys(selections).length === 0 && extras.length === 0) {
        summary.innerHTML = '<p class="text-muted fst-italic mb-0">No selections made yet</p>'
        return
    }

    const items = [
        { key: 'platform', label: 'Platform', icon: 'bi-pc-display' },
        { key: 'pythonVersion', label: 'Python', icon: 'bi-code-square' },
        { key: 'pytorchVersion', label: 'PyTorch', icon: 'bi-fire' },
        { key: 'computeType', label: 'Compute', icon: 'bi-gpu-card' },
        { key: 'computeVersion', label: 'Version', icon: 'bi-badge-vr' }
    ]

    // B5: compact chips instead of a tall list; A3: neutral value text,
    // green is reserved for genuine success states.
    let chips = ''
    items.forEach(({ key, label, icon }) => {
        if (!Object.hasOwn(selections, key)) return
        let data = selections[key]
        if (key == 'computeType' && data !== 'CPU' && includeCPU) { data += ' + CPU' }
        chips += `
        <span class="selection-chip">
          <i class="${icon} me-1"></i>
          <span class="selection-chip-label">${label}</span>
          <span class="selection-value">${data}</span>
        </span>`
    })

    if (extras.length > 0) {
        chips += `
        <span class="selection-chip">
          <i class="bi-box-seam me-1"></i>
          <span class="selection-chip-label">Additional Packages</span>
          <span class="selection-value">${extras.join(', ')}</span>
        </span>`
    }

    summary.innerHTML = `<div class="d-flex flex-wrap gap-2">${chips}</div>`
}
