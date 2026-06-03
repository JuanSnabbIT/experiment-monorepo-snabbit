import { configureStore, Action, Reducer, AnyAction, Store } from '@reduxjs/toolkit';
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist';
import { PERSIST_STORE_NAME } from '@/constants/app.constant';
import rootReducer, { RootState, AsyncReducers } from './rootReducer';
import RtkQueryService from '@/services/RtkQueryService';

// Implementación directa de localStorage para evitar el problema de resolución CJS→ESM en Vite 8
// (redux-persist/lib/storage devuelve el namespace del módulo en lugar del default export)
const storage = {
    getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const middlewares: any[] = [RtkQueryService.middleware];

const persistConfig = {
    key: PERSIST_STORE_NAME,
    keyPrefix: '',
    storage,
    whitelist: ['auth', 'core'],
};

interface CustomStore extends Store<RootState, AnyAction> {
    asyncReducers?: AsyncReducers;
}

const store: CustomStore = configureStore({
    reducer: persistReducer(persistConfig, rootReducer() as Reducer),
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            immutableCheck: false,
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }).concat(middlewares),
    devTools: import.meta.env.DEV,
});

store.asyncReducers = {};

export const persistor = persistStore(store);

export function injectReducer<S>(key: string, reducer: Reducer<S, Action>) {
    if (store.asyncReducers) {
        if (store.asyncReducers[key]) {
            return false;
        }
        store.asyncReducers[key] = reducer;
        store.replaceReducer(
            persistReducer(persistConfig, rootReducer(store.asyncReducers) as Reducer),
        );
    }
    persistor.persist();
    return store;
}

export type AppDispatch = typeof store.dispatch;

export default store;
