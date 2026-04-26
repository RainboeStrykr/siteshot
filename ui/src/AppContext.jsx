// Central app context — holds all state and handlers shared across panels.
// Populated by App.jsx and consumed by LeftSidebar, AnnotationBar, ExportFooter, etc.
import { createContext, useContext } from 'react'

export const AppContext = createContext(null)

export const useAppContext = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within <AppContext.Provider>')
  return ctx
}
