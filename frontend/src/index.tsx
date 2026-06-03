import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';

import { ThemeContextProvider } from './context/themeContext';
// import { AuthProvider } from './context/authContext';

import App from './App/App';
import AppInitializer from './components/AppInitializer';
import AppLoader from './components/AppLoader';

import './i18n';
import './styles/index.css';

import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css';
import 'swiper/css';
import './styles/vendors.css';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './store';


// Suscribirse a cambios del store para debug
store.subscribe(() => {
    const state = store.getState().auth;
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <Provider store={store}>
            <PersistGate 
                loading={<AppLoader message='Iniciando...' />} 
                persistor={persistor}
                onBeforeLift={() => {
                }}
            >
                <AppInitializer loadingComponent={<AppLoader message='Verificando sesión...' />}>
                    <ThemeContextProvider>
                        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                            <App />
                        </BrowserRouter>
                    </ThemeContextProvider>
                </AppInitializer>
            </PersistGate>
        </Provider>
    </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
