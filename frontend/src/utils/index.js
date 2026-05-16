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

export function showOutput(toml, cmd) {
    document.getElementById('configOutput').textContent = toml;
    document.getElementById('commandOutput').textContent = cmd;
}


