import React from 'react';
import ReactDOM from 'react-dom/client';
import NexoApp from './nexo/NexoApp.jsx';

// Force unregister all old service workers to bust cache
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
            registration.unregister();
        }
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <NexoApp />
    </React.StrictMode>
);
