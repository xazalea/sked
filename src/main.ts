import './styles.css';
import { App } from './App';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    new App(app);
  }
});

