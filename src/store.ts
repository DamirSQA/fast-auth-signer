// @ts-nocheck
import { configureStore } from '@reduxjs/toolkit';
import logger from 'redux-logger';
import { createStore } from 'redux';
import tokenFiatValueSlice from './Redux/Slices/TokenFiatValues';
import createMiddleware from './Redux/middleware';

const reducer = {
  tokenFiatValueSlice: tokenFiatValueSlice.reducer,
};

const preloadedState = {
  tokenFiatValueSlice : {
     tokens: ''
    }
};

export const store = configureStore({
  reducer,

middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
devTools: process.env.NODE_ENV !== 'production',
preloadedState,
enhancers: [batchedSubscribe(debounceNotify)],
})

// export const store = createStore(
//   reducer.tokenFiatValueSlice,
//   createMiddleware(history)
// );

console.log(store.getState());
