// E1: self-hosted IBM Plex pairing (editorial-technical). Latin subset,
// only the weights actually used. Vite bundles the woff2 from the
// @fontsource packages, so there is no Google CDN request at runtime.
import '@fontsource/ibm-plex-sans-condensed/latin-300.css'
import '@fontsource/ibm-plex-sans-condensed/latin-400.css'
import '@fontsource/ibm-plex-sans-condensed/latin-600.css'
import '@fontsource/ibm-plex-sans-condensed/latin-700.css'
// E1 (pivot): full-width IBM Plex Sans 700 for the display title only;
// the condensed face still carries body text.
import '@fontsource/ibm-plex-sans/latin-700.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'

import './style.scss'

// Import Bootstrap JS
import * as bootstrap from 'bootstrap'

import initApp from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  initApp()
    .catch(err => console.error('App failed to start:', err));
});
