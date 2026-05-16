export function getUniqueValues(pkgs) {
    const acc = {};
    pkgs.forEach(p => {
        ['platform', 'python_version', 'version', 'compute_type', 'compute_version']
            .forEach(k => {
                acc[k] ||= new Set();
                acc[k].add(p[k]);
            });
    });

    return Object.fromEntries(
        Object.entries(acc).map(([key, s]) => {
            let unique = [...s]
            if (key === 'version' || key === 'compute_version' || key === 'python_version') {

                // Sort versions numerically (e.g., 2.10.0 after 2.9.0)
                unique.sort((a, b) => {
                    const aParts = a.split('.').map(Number)
                    const bParts = b.split('.').map(Number)
                    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                        const aPart = aParts[i] || 0
                        const bPart = bParts[i] || 0
                        if (aPart !== bPart) return bPart - aPart // Descending order
                    }
                    return 0
                })
            } else {
                // Regular alphabetical sort for other fields
                unique.sort()
            }
            return [key, unique]
        })
    );

}


/**
 * Return an array of [computeType, computeVersion] for each unique
 * pairing found in your packages.
 */
export function getComputePairs(pkgs) {
  const seen = new Set();
  const pairs = [];

  pkgs.forEach(p => {
    const type = p.compute_type;
    const ver  = p.compute_version;
    const key  = `${type}|${ver}`;      // unique string key

    if (!seen.has(key)) {
      seen.add(key);
      pairs.push([type, ver]);          // two‑string inner array
    }
  });

  return pairs;
}

/** Filter packages by selections, optionally excluding one field */
export function getFilteredPackages(allPkgs, selections, excludeId = null) {
    return allPkgs.filter(p => {
        return Object.entries(selections).every(([id, val]) => {
            if (id === excludeId) return true;
            const key = {
                platform: 'platform',
                pythonVersion: 'python_version',
                pytorchVersion: 'version',
                computeType: 'compute_type',
                computeVersion: 'compute_version'
            }[id];
            return p[key] === val;
        });
    });
}

/** Simple zip implementation */
export function zip(arrays) {
    return arrays[0].map((_, i) => arrays.map(arr => arr[i]));
}
/** Display TOML & command in the output card */

/**
 * C5: drive the single output status line. Kept here so both the
 * generation flow (showOutput) and the no-match branches in
 * generatorService can report state through one polite live region.
 */
export function setOutputStatus(text) {
    const statusEl = document.getElementById('outputStatus');
    if (statusEl !== null) {
        statusEl.textContent = text;
    }
}

export function showOutput(toml, cmd) {
    const configEl = document.getElementById('configOutput');
    const prevToml = configEl.textContent;

    configEl.textContent = toml;
    document.getElementById('commandOutput').textContent = cmd;

    // C1: keep the output card visible at all times; swap between a stable
    // empty-state hint and the generated content instead of blanking it.
    const hasOutput = toml.length > 0;
    const emptyState = document.getElementById('outputEmptyState');
    const content = document.getElementById('outputContent');
    if (emptyState !== null) {
        emptyState.hidden = hasOutput;
    }
    if (content !== null) {
        content.hidden = !hasOutput;
    }

    // D1: copy is only actionable once real output exists.
    // showOutput is reached only via the generation flow, which runs only
    // after a successful init; the fatal path returns before event wiring,
    // so this never re-enables controls disableAllControls() locked down.
    ['copyConfigBtn', 'copyCommandBtn', 'copyAllBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn !== null) {
            btn.disabled = !hasOutput;
        }
    });

    // C5: status line + a single pulse only on a real content change.
    // The reduced-motion media query neutralizes the animation in CSS,
    // so adding the class unconditionally here is safe.
    setOutputStatus(hasOutput ? 'Generated from current selections' : 'Waiting for selections');

    if (hasOutput && toml !== prevToml) {
        const section = document.getElementById('outputSection');
        if (section !== null) {
            section.classList.remove('output-update');
            // force reflow so the animation can retrigger on each change
            void section.offsetWidth;
            section.classList.add('output-update');
        }
    }
}


