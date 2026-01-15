import React, { useContext } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { ThemeContext, themes } from 'contexts/ThemeContext';
import { t } from 'translations/translate';

/**
 * Reusable confirmation modal component
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} toggle - Function to toggle modal visibility
 * @param {function} onConfirm - Function to call when user confirms
 * @param {string} title - Modal title (optional, defaults to "Confirmation")
 * @param {string} message - The confirmation message to display
 * @param {string} confirmText - Text for confirm button (optional, defaults to "Yes")
 * @param {string} cancelText - Text for cancel button (optional, defaults to "No")
 * @param {string} confirmColor - Color for confirm button (optional, defaults to "danger")
 */
function ConfirmModal({ 
  isOpen, 
  toggle, 
  onConfirm, 
  title,
  message, 
  confirmText,
  cancelText,
  confirmColor = 'danger'
}) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === themes.dark;

  const handleConfirm = () => {
    onConfirm();
    toggle();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      toggle={toggle} 
      centered 
      className={isDark ? 'modal-black' : ''}
      style={{ 
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        margin: 0
      }}
      contentClassName="mx-auto"
    >
      <ModalHeader toggle={toggle}>
        <i className="tim-icons icon-alert-circle-exc mr-2" />
        {title || t("confirmTitle")}
      </ModalHeader>
      <ModalBody>
        <p className="mb-0">{message}</p>
      </ModalBody>
      <ModalFooter>
        <Button color={confirmColor} onClick={handleConfirm}>
          {confirmText || t("confirmYes")}
        </Button>
        <Button color="secondary" onClick={toggle}>
          {cancelText || t("confirmNo")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmModal;
