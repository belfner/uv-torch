import { showOutput } from '../utils/index.js';

// Tracks current user selections
export const selections = {};

/** Read all dropdowns into the selections object */
export function updateSelectionsFromDOM() {
  ['platform','pythonVersion','pytorchVersion','computeType','computeVersion']
    .forEach(id => {
      const val = document.getElementById(id).value;
      if (val) selections[id] = val;
      else delete selections[id];
    });
}

/** Clear all selections programmatically */
export function clearAllSelections() {
  Object.keys(selections).forEach(k => delete selections[k]);

  ['platform','pythonVersion','pytorchVersion','computeType','computeVersion']
    .forEach(id => {
      document.getElementById(id).value = ''
    })

  // Reset checkboxes
  document.getElementById('includeTorchvision').checked = false
  document.getElementById('includeTorchaudio').checked = false
  document.getElementById('includeCPU').checked = false
  document.getElementById('includeCPU').disabled = true

  showOutput('','')
}