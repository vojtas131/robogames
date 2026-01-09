import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmModal from './ConfirmModal';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    confirmColor: 'danger',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || '',
        message: options.message || '',
        confirmText: options.confirmText || '',
        cancelText: options.cancelText || '',
        confirmColor: options.confirmColor || 'danger',
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  const handleToggle = () => {
    confirmState.onCancel();
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        toggle={handleToggle}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
      />
    </ConfirmContext.Provider>
  );
};

export default ConfirmModal;
