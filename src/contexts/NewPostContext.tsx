import { createContext, useContext, useState, ReactNode } from 'react';

interface NewPostContextType {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

const NewPostContext = createContext<NewPostContextType | undefined>(undefined);

export function NewPostProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => setIsOpen(false);

  return (
    <NewPostContext.Provider value={{ isOpen, openDialog, closeDialog }}>
      {children}
    </NewPostContext.Provider>
  );
}

export function useNewPost() {
  const context = useContext(NewPostContext);
  if (context === undefined) {
    throw new Error('useNewPost must be used within a NewPostProvider');
  }
  return context;
}
