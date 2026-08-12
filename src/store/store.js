import { configureStore } from '@reduxjs/toolkit'
import departmentReducer from './features/department/departmentSlice'
import assessmentReducer from './features/assessment/assessmentSlice'
export const store = configureStore({
  reducer: {
     departmentTool: departmentReducer,
     assessment:     assessmentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
})
