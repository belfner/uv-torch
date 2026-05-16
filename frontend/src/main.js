import './style.scss'

// Import Bootstrap JS
import * as bootstrap from 'bootstrap'

import initApp from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  initApp()
    .catch(err => console.error('App failed to start:', err));
});
