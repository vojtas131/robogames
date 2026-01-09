import React, { useContext } from 'react';
import { useToast } from 'contexts/ToastContext';
import { ThemeContext, themes } from 'contexts/ThemeContext';
import './Toast.css';

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === themes.dark;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return 'tim-icons icon-check-2';
      case 'error':
        return 'tim-icons icon-alert-circle-exc';
      case 'warning':
        return 'tim-icons icon-bell-55';
      case 'info':
      default:
        return 'tim-icons icon-bulb-63';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return { bg: isDark ? 'rgba(45, 206, 137, 0.95)' : 'rgba(45, 206, 137, 0.95)', border: '#2dce89' };
      case 'error':
        return { bg: isDark ? 'rgba(245, 54, 92, 0.95)' : 'rgba(245, 54, 92, 0.95)', border: '#f5365c' };
      case 'warning':
        return { bg: isDark ? 'rgba(251, 99, 64, 0.95)' : 'rgba(251, 175, 64, 0.95)', border: '#fb6340' };
      case 'info':
      default:
        return { bg: isDark ? 'rgba(17, 205, 239, 0.95)' : 'rgba(17, 205, 239, 0.95)', border: '#11cdef' };
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const colors = getTypeColor(toast.type);
        return (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type}`}
            style={{
              backgroundColor: colors.bg,
              borderLeft: `4px solid ${colors.border}`,
            }}
          >
            <div className="toast-icon">
              <i className={getIcon(toast.type)} />
            </div>
            <div className="toast-message">
              {toast.message}
            </div>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
            >
              <i className="tim-icons icon-simple-remove" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
