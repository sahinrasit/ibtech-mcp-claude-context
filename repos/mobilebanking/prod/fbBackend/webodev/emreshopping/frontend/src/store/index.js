import { configureStore } from '@reduxjs/toolkit';
import visitedProductsReducer from './slices/visitedProductsSlice';

export const store = configureStore({
  reducer: {
    visitedProducts: visitedProductsReducer,
  },
}); 