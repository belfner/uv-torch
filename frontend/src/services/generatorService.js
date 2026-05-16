// Encapsulates logic to auto-generate TOML snippet and install command
import { getFilteredPackages, getUniqueValues, zip, getComputePairs } from '../utils/index.js';
import { selections } from './selectionService.js';
import { showNotification } from './uiService.js';
import { showOutput, setOutputStatus } from '../utils/index.js';

function createIndexName(computeType, computeVersion) {
  let computeVersionString = ''
  if (computeVersion !== null) {
    computeVersionString = simplifyVersionString(computeVersion)
  }
  return `pytorch-${computeType.toLowerCase()}${computeVersionString}`
}

function createIndexText(url, indexName) {
  return `[[tool.uv.index]]
name = "${indexName}"
url = "${url}"
explicit = true`
}

function createSingleSourcesText(indexName, computeType, includeTorchvision, includeTorchaudio,) {
  let platformMarker = ''

  if (computeType === 'CUDA' || computeType === 'XPU') {
    platformMarker = ', marker = "sys_platform == \'linux\' or sys_platform == \'win32\'"'
  } else if (computeType === 'ROCM') {
    platformMarker = ', marker = "sys_platform == \'linux\'"'
  }

  let sourceText = `    {index = "${indexName}"${platformMarker}},`

  let s = `[tool.uv.sources]
torch = [
${sourceText}
]`

  if (includeTorchvision) {
    s += `
torchvision = [
${sourceText}
]`
  }

  if (includeTorchaudio) {
    s += `
torchaudio = [
${sourceText}
]`
  }

  return s
}

function createSourcesText(indexNames, extraNames, computeTypes, includeTorchvision, includeTorchaudio,) {
  let sourcesData = []

  zip([indexNames, extraNames, computeTypes]).forEach(vals => {
    const [indexName, extraName, computeType] = vals

    let platformMarker = ''

    if (computeType === 'CUDA' || computeType === 'XPU') {
      platformMarker = ', marker = "sys_platform == \'linux\' or sys_platform == \'win32\'"'
    } else if (computeType === 'ROCM') {
      platformMarker = ', marker = "sys_platform == \'linux\'"'
    }
    let sourceText = `    {index = "${indexName}", extra = "${extraName}"${platformMarker}},`
    sourcesData.push(sourceText)
  })

  let allSourcesText = sourcesData.join('\n')

  let s = `[tool.uv.sources]
torch = [
${allSourcesText}
]`

  if (includeTorchvision) {
    s += `
torchvision = [
${allSourcesText}
]`
  }

  if (includeTorchaudio) {
    s += `
torchaudio = [
${allSourcesText}
]`
  }

  return s
}

function createConflictsText(extraNames) {
  let s = `[tool.uv]
conflicts = [
  [
`
  extraNames.forEach(extraName => {
    s += `    { extra = "${extraName}" },\n`
  })
  s += `  ],
]`
  return s
}

function createOptionalDepsText(extraNames, pytorchVersion, includeTorchvision, includeTorchaudio, torchvisionVersion, torchaudioVersion) {
  let s = '[project.optional-dependencies]\n'

  extraNames.forEach(extraName => {
    s += `${extraName} = [
  "torch==${pytorchVersion}",
`
    if (includeTorchvision) { s += `  "torchvision==${torchvisionVersion}",\n` }
    if (includeTorchaudio) {
      const audioPin = (torchaudioVersion !== undefined && torchaudioVersion !== null && torchaudioVersion !== '')
        ? `torchaudio==${torchaudioVersion}`
        : 'torchaudio'
      s += `  "${audioPin}",\n`
    }

    s += ']\n'
  })
  return s
}

function createUvCommand(includeTorchvision, includeTorchaudio, pytorchVersion = null, torchvisionVersion = null, torchaudioVersion = null) {
  let cmd = 'uv add torch'
  if (pytorchVersion !== null) cmd += `==${pytorchVersion}`
  if (includeTorchvision) cmd += ' torchvision'
  if (includeTorchvision && torchvisionVersion !== null) cmd += `==${torchvisionVersion}`
  if (includeTorchaudio) cmd += ' torchaudio'
  if (includeTorchaudio && torchaudioVersion !== null) cmd += `==${torchaudioVersion}`
  return cmd
}

function generateBasicConfiguration(pkgs) {
  if (pkgs.length === 0) {
    setOutputStatus('No compatible package found')
    showNotification('No matching packages found!', 'danger')
    return
  }
  const uniqueValues = getUniqueValues(pkgs.slice(0, 1))
  const selected = pkgs[0]
  const pytorchVersion = uniqueValues['version'][0]
  const torchvisionVersion = pkgs[0]['torchvision_version']
  const torchaudioVersion = pkgs[0]['torchaudio_version'] ?? null

  const indexName = createIndexName(selected.compute_type, null)
  const indexText = createIndexText(selected.index_url, indexName)

  const sourcesText = createSingleSourcesText(
    indexName, selected.compute_type,
    document.getElementById('includeTorchvision').checked,
    document.getElementById('includeTorchaudio').checked,
  )

  const configText = `${sourcesText}\n\n${indexText}`
  const commandText = createUvCommand(
    document.getElementById('includeTorchvision').checked,
    document.getElementById('includeTorchaudio').checked,
    pytorchVersion,
    torchvisionVersion,
    torchaudioVersion
  )

  showOutput(configText, commandText);
}

function getSelectionsCopy() {
  return JSON.parse(JSON.stringify(selections));
}

function simplifyVersionString(versionStr) {
  return versionStr.replaceAll('.', '')
}

function getIndexUrls(pkgs, computePairs) {
  var indexUrls = {}

  computePairs.forEach(data => {
    const [computeType, computeVersion] = data
    let selectionCopy = getSelectionsCopy()
    selectionCopy['computeType'] = computeType
    selectionCopy['computeVersion'] = computeVersion
    let indexUrl = getFilteredPackages(pkgs, selectionCopy)[0]['index_url']
    indexUrls[`${computeType}|${computeVersion}`] = indexUrl
  })
  return indexUrls
}


function generatePytorchComputeTypeConfiguration(pkgs) {
  // TODO add ability to optionally include CPU version as well
  if (pkgs.length === 0) {
    setOutputStatus('No compatible package found')
    showNotification('No matching packages found!', 'danger')
    return
  }

  const baseComputeType = pkgs[0]['compute_type']
  const pytorchVersion = pkgs[0]['version']
  const torchvisionVersion = pkgs[0]['torchvision_version']
  const torchaudioVersion = pkgs[0]['torchaudio_version'] ?? null

  const includeCPU = document.getElementById('includeCPU').checked

  if (includeCPU) {
    let selectionCopy = getSelectionsCopy()
    delete selectionCopy['computeVersion']
    selectionCopy['computeType'] = 'CPU'

    pkgs = pkgs.concat(getFilteredPackages(window.__allReleases, selectionCopy))
  }


  const computePairs = getComputePairs(pkgs)

  let indexStrings = []
  let indexNames = []
  let extraNames = []

  if (baseComputeType === 'CPU' || (baseComputeType === 'XPU' && !includeCPU)) {
    generateBasicConfiguration(pkgs)
    return
  }

  let indexUrls = getIndexUrls(pkgs,computePairs)


  computePairs.forEach(data => {
    const [computeType, computeVersion] = data

    let validatedComputeVersion = computeVersion
    let versionStr = simplifyVersionString(computeVersion)
    if (computeVersion === '0.0.0') {
      validatedComputeVersion = null
      versionStr = ''
    }
    let indexName = createIndexName(computeType, computeVersion)
    indexNames.push(indexName)
    indexStrings.push(createIndexText(indexUrls[`${computeType}|${computeVersion}`], indexName))
    
    let extraName = `${computeType.toLowerCase()}${versionStr}`
    extraNames.push(extraName)
  })



  const indexText = indexStrings.join('\n\n')

  let computeTypes = computePairs.map(pair => pair[0])

  const sourcesText = createSourcesText(
    indexNames, extraNames, computeTypes,
    document.getElementById('includeTorchvision').checked,
    document.getElementById('includeTorchaudio').checked,
  )

  const conflictsText = createConflictsText(extraNames)

  const optionalDepsText = createOptionalDepsText(extraNames,
    pytorchVersion,
    document.getElementById('includeTorchvision').checked,
    document.getElementById('includeTorchaudio').checked,
    torchvisionVersion,
    torchaudioVersion
  )

  const configText = `${optionalDepsText}\n${conflictsText}\n\n${sourcesText}\n\n${indexText}`
  const commandText = 'uv sync --extra SELECTED_PYTORCH_SOURCE'


  showOutput(configText, commandText);
}

function getLatestComputeVersion(versions) {
  versions.sort((a, b) => {
    const aParts = a.split('.').map(Number)
    const bParts = b.split('.').map(Number)
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0
      const bPart = bParts[i] || 0
      if (aPart !== bPart) return bPart - aPart // Descending order
    }
    return 0
  })
  return versions[0]
}

function getAllLatestComputeVersions(pkgs, uniqueValues) {
  var computeVersions = {}
  var indexUrls = {}

  uniqueValues['compute_type'].forEach(computeType => {
    let selectionCopy = getSelectionsCopy()
    delete selectionCopy['computeVersion']
    selectionCopy['computeType'] = computeType
    let subUniqueValues = getUniqueValues(getFilteredPackages(pkgs, selectionCopy))

    computeVersions[computeType] = getLatestComputeVersion(subUniqueValues['compute_version'])
    selectionCopy['computeVersion'] = computeVersions[computeType]
    let indexUrl = getFilteredPackages(pkgs, selectionCopy)[0]['index_url']
    indexUrls[computeType] = indexUrl

  })
  return [computeVersions, indexUrls]
}

function generatePytorchOnlyConfiguration(pkgs) {
  if (pkgs.length === 0) {
    setOutputStatus('No compatible package found')
    showNotification('No matching packages found!', 'danger')
    return
  }

  const includeCPU = document.getElementById('includeCPU').checked
  if (includeCPU) {
    let selectionCopy = getSelectionsCopy()
    delete selectionCopy['computeVersion']
    selectionCopy['computeType'] = 'CPU'

    pkgs = pkgs.concat(getFilteredPackages(window.__allReleases, selectionCopy))
  }


  const uniqueValues = getUniqueValues(pkgs)

  const [latestComputeVersions, indexUrls] = getAllLatestComputeVersions(pkgs, uniqueValues)
  const pytorchVersion = uniqueValues['version'][0]
  const torchvisionVersion = pkgs[0]['torchvision_version']
  const torchaudioVersion = pkgs[0]['torchaudio_version'] ?? null


  let indexStrings = []
  let indexNames = []
  let extraNames = []

  for (const [computeType, computeVersion] of Object.entries(latestComputeVersions)) {
    let validatedComputeVersion = computeVersion
    if (includeCPU || computeVersion === '0.0.0') {
      validatedComputeVersion = null
    }
    let indexName = createIndexName(computeType, validatedComputeVersion)
    indexNames.push(indexName)
    indexStrings.push(createIndexText(indexUrls[computeType], indexName))
    // TODO determine if version number should be part of extra name when there is only one version used
    let versionStr = ''
    if (!includeCPU && computeVersion !== '0.0.0') {
      versionStr = simplifyVersionString(computeVersion)
    }
    let extraName = `${computeType.toLowerCase()}${versionStr}`
    extraNames.push(extraName)
  }

  const indexText = indexStrings.join('\n\n')

  const sourcesText = createSourcesText(
    indexNames, extraNames, uniqueValues['compute_type'],
    document.getElementById('includeTorchvision').checked,
    document.getElementById('includeTorchaudio').checked,
  )

  const conflictsText = createConflictsText(extraNames)

  const optionalDepsText = createOptionalDepsText(extraNames,
    pytorchVersion,
    document.getElementById('includeTorchvision').checked,
    document.getElementById('includeTorchaudio').checked,
    torchvisionVersion,
    torchaudioVersion
  )

  const configText = `${optionalDepsText}\n${conflictsText}\n\n${sourcesText}\n\n${indexText}`
  const commandText = 'uv sync --extra SELECTED_PYTORCH_SOURCE'

  showOutput(configText, commandText);
}

export function maybeAutoGenerate() {
  const pkgs = getFilteredPackages(window.__allReleases, selections)
  const includeCPU = document.getElementById('includeCPU').checked


  // Option N: Pytorch Version & Compute Type & Compute Version
  var required = ['pytorchVersion', 'computeType', 'computeVersion']
  var hasRequired = required.every(field => selections[field])

  if (hasRequired) {
    if (includeCPU) {
      generatePytorchOnlyConfiguration(pkgs);
    } else {
      generateBasicConfiguration(pkgs)
    }

    return
  }

  // Option N: Pytorch Version & Compute Type
  var required = ['pytorchVersion', 'computeType']
  var hasRequired = required.every(field => selections[field])

  if (hasRequired) {
    generatePytorchComputeTypeConfiguration(pkgs)
    return
  }

  // Option N: Just Pytorch Version
  var required = ['pytorchVersion']
  var hasRequired = required.every(field => selections[field])

  if (hasRequired) {
    generatePytorchOnlyConfiguration(pkgs)
    return
  }

  // No complete selection yet: showOutput renders the stable empty state
  // (card stays visible, copy disabled) instead of blanking.
  showOutput('', '');

}
