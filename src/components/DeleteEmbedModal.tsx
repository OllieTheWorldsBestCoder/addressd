import React from 'react';
import styles from '../styles/DeleteEmbedModal.module.css';

interface DeleteEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteEmbedModal({ isOpen, onClose, onConfirm }: DeleteEmbedModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Cancel Subscription</h2>
        <p>
          Warning: Deleting this embed will cancel your subscription at the end of the current billing period. 
          You will continue to be charged until the end of the period.
        </p>
        <div className={styles.buttonGroup}>
          <button onClick={onClose} className={styles.cancelButton}>
            Keep Subscription
          </button>
          <button onClick={onConfirm} className={styles.deleteButton}>
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
} 