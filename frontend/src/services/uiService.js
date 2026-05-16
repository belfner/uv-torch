// Handles DOM events, toasts, copy/download, and wiring selection changes
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
            maybeAutoGenerate();
            updateSelectionsSummary();
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
        .addEventListener('click', () => copyText('configOutput'));
    document.getElementById('copyCommandBtn')
        .addEventListener('click', () => copyText('commandOutput'));
    document.getElementById('copyAllBtn')
        .addEventListener('click', () => copyAll());

    // Download button
    document.getElementById('downloadBtn')
        .addEventListener('click', () => downloadAll());
}

function onComputeTypeChange() {
    const computeTypeElement = document.getElementById('computeType')
    const computeVersionElement = document.getElementById('computeVersion')
    const includeCPUElement = document.getElementById('includeCPU')
    const computeType = computeTypeElement.value

    if (!computeType || computeType === 'CPU' || computeType === 'XPU') {
        computeVersionElement.disabled = true
        computeVersionElement.value = ''
        delete selections.computeVersion
    } else {
        computeVersionElement.disabled = false
        computeVersionElement.value = ''
    }
    if (!computeType || computeType === 'CPU') {
        includeCPUElement.checked = false
        includeCPUElement.disabled = true

    } else {
        includeCPUElement.disabled = false
    }

    onSelectionChange();
}

function resetField(buttonEl) {
    const fieldName = buttonEl.dataset.field;
    delete selections[fieldName];

    const control = document.getElementById(fieldName);
    if (control) {
        control.value = '';
    }

    if (fieldName === 'computeType') {
        const cv = document.getElementById('computeVersion');
        cv.value = '';
        cv.disabled = true;
        delete selections.computeVersion;
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
    maybeAutoGenerate();
}

/** Show a Bootstrap toast */
export function showNotification(msg, type = 'info') {
    toastEl.querySelector('.toast-body').textContent = msg;
    toastEl.className = `toast align-items-center text-white bg-${type}`;
    toast.show();
}


/** Copy text content of an element to clipboard */
async function copyText(elId) {
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
async function copyAll() {
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

/** Trigger download of a .txt file containing both outputs */
function downloadAll() {
    const toml = document.getElementById('configOutput').textContent;
    const cmd = document.getElementById('commandOutput').textContent;
    if (toml.length === 0) {
        showNotification('No text to download', 'info');
        return
    }

    const content = toml + '\n\n' + cmd;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pytorch_uv_config.txt';
    a.click();
    URL.revokeObjectURL(url);
}

function updateSelectionsSummary() {
    const summary = document.getElementById('selectionsSummary')
    const includeCPU = document.getElementById('includeCPU').checked
    if (Object.keys(selections).length === 0) {
        summary.innerHTML = '<p class="text-muted fst-italic">No selections made yet</p>'
        return
    }

    let html = '<ul class="list-unstyled mb-0">'

    const items = [
        { key: 'platform', label: 'Platform', icon: 'bi-pc-display' },
        { key: 'pythonVersion', label: 'Python', icon: 'bi-code-square' },
        { key: 'pytorchVersion', label: 'PyTorch', icon: 'bi-fire' },
        { key: 'computeType', label: 'Compute', icon: 'bi-gpu-card' },
        { key: 'computeVersion', label: 'Version', icon: 'bi-badge-vr' }
    ]

    items.forEach(({ key, label, icon }) => {
        if (!Object.hasOwn(selections, key)) return
        let data = selections[key]
        if (key == 'computeType' && data !== 'CPU' && includeCPU) { data += ' + CPU' }
        html += `
        <li class="mb-2">
          <i class="${icon} text-primary me-2"></i>
          <strong>${label}:</strong>
          <span class="text-success">${data}</span>
        </li>`
    })

    const extras = []
    if (document.getElementById('includeTorchvision').checked) extras.push('torchvision')
    if (document.getElementById('includeTorchaudio').checked) extras.push('torchaudio')

    if (extras.length) {
        html += `
      <li class="mb-2">
        <i class="bi-box-seam text-primary me-2"></i>
        <strong>Packages:</strong>
        <span class="text-success">${extras.join(', ')}</span>
      </li>`
    }

    html += '</ul>'
    summary.innerHTML = html
}
