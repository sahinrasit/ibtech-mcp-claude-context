import { createSlice } from '@reduxjs/toolkit';

const visitedProductsSlice = createSlice({
  name: 'visitedProducts',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {
    addVisitedProduct: (state, action) => {
      const existingProduct = state.items.find(item => item.id === action.payload.id);
      if (!existingProduct) {
        state.items.unshift(action.payload);
        if (state.items.length > 10) {
          state.items.pop();
        }
      }
    },
    clearVisitedProducts: (state) => {
      state.items = [];
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setVisitedProducts: (state, action) => {
      state.items = action.payload;
    }
  },
});

export const { 
  addVisitedProduct, 
  clearVisitedProducts, 
  setLoading, 
  setError, 
  setVisitedProducts 
} = visitedProductsSlice.actions;

export default visitedProductsSlice.reducer; 