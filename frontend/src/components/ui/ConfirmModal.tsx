'use client';

import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary';
    isPending?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirmar',
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    isPending = false,
}: ConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
            <ModalFooter>
                <Button type="button" variant="secondary" onClick={onClose}>
                    {cancelLabel}
                </Button>
                <Button
                    type="button"
                    variant={variant}
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    disabled={isPending}
                >
                    {confirmLabel}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
