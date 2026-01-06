import { createRoot } from 'react-dom/client';
import App from './raApp';

const container = document.getElementById('ra-root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);
