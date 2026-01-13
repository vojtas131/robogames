/**
 * HoldToConfirmModal - A confirmation modal that requires holding a button for a specified duration
 * Used for critical actions that should not be triggered accidentally
 */
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    Button,
    Progress
} from 'reactstrap';
import { t } from "translations/translate";

function HoldToConfirmModal({ 
    isOpen, 
    toggle, 
    onConfirm, 
    title, 
    message, 
    holdDuration = 3000, // default 3 seconds
    confirmText,
    cancelText,
    icon = "icon-alert-circle-exc",
    color = "warning"
}) {
    const [progress, setProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [completed, setCompleted] = useState(false);
    const intervalRef = useRef(null);
    const startTimeRef = useRef(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setProgress(0);
            setIsHolding(false);
            setCompleted(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        } else {
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleMouseDown = () => {
        if (completed) return;
        
        setIsHolding(true);
        startTimeRef.current = Date.now();
        
        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
            setProgress(newProgress);
            
            if (newProgress >= 100) {
                clearInterval(intervalRef.current);
                setCompleted(true);
                setIsHolding(false);
                // Small delay before executing action for visual feedback
                setTimeout(() => {
                    onConfirm();
                    toggle();
                }, 200);
            }
        }, 30);
    };

    const handleMouseUp = () => {
        if (completed) return;
        
        setIsHolding(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        // Reset progress if not completed
        if (progress < 100) {
            setProgress(0);
        }
    };

    const handleMouseLeave = () => {
        handleMouseUp();
    };

    // Touch events for mobile
    const handleTouchStart = (e) => {
        e.preventDefault();
        handleMouseDown();
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        handleMouseUp();
    };

    const getProgressColor = () => {
        if (progress < 33) return 'warning';
        if (progress < 66) return 'warning';
        if (progress < 100) return 'success';
        return 'success';
    };

    if (!isOpen) return null;

    const modalContent = (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: '20px'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isHolding) {
                    toggle();
                }
            }}
        >
            <div 
                className="card"
                style={{
                    maxWidth: '500px',
                    width: '100%',
                    margin: 0,
                    borderRadius: '10px',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="card-header d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h5 className="mb-0">
                        <i className={`tim-icons ${icon} mr-2`} style={{ color: color === 'warning' ? '#ff8d72' : '#fd5d93' }} />
                        {title}
                    </h5>
                    <button 
                        type="button" 
                        className="close" 
                        onClick={toggle}
                        style={{ color: 'white', textShadow: 'none', opacity: 0.7 }}
                    >
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                
                {/* Body */}
                <div className="card-body text-center py-4">
                    <div className="mb-4">
                        <i 
                            className={`tim-icons ${icon}`} 
                            style={{ 
                                fontSize: '4rem', 
                                color: color === 'warning' ? '#ff8d72' : '#fd5d93',
                                opacity: 0.8
                            }} 
                        />
                    </div>
                    <p className="mb-4" style={{ fontSize: '1.1rem' }}>{message}</p>
                    
                    <div className="mb-3">
                        <Progress 
                            value={progress} 
                            color={getProgressColor()}
                            style={{ 
                                height: '25px', 
                                borderRadius: '12px',
                                backgroundColor: 'rgba(255,255,255,0.1)'
                            }}
                        >
                            {progress > 10 && (
                                <span style={{ 
                                    position: 'absolute', 
                                    width: '100%', 
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    lineHeight: '25px'
                                }}>
                                    {Math.round(progress)}%
                                </span>
                            )}
                        </Progress>
                    </div>
                    
                    <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                        {completed 
                            ? (t("holdConfirmComplete") || "✓ Potvrzeno!") 
                            : isHolding 
                                ? (t("holdConfirmHolding") || "Držte tlačítko...") 
                                : (t("holdConfirmInstruction", { seconds: holdDuration / 1000 }) || `Držte tlačítko ${holdDuration / 1000} sekund pro potvrzení`)}
                    </p>
                </div>
                
                {/* Footer */}
                <div className="card-footer d-flex justify-content-center" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', gap: '10px' }}>
                    <Button 
                        color="secondary" 
                        onClick={toggle}
                        disabled={isHolding}
                    >
                        {cancelText || t("cancel") || "Zrušit"}
                    </Button>
                    <Button
                        color={completed ? "success" : color}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        disabled={completed}
                        style={{ 
                            minWidth: '180px',
                            transition: 'all 0.3s ease',
                            transform: isHolding ? 'scale(0.98)' : 'scale(1)',
                            boxShadow: isHolding ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none'
                        }}
                    >
                        {completed ? (
                            <>
                                <i className="tim-icons icon-check-2 mr-2" />
                                {t("confirmed") || "Potvrzeno"}
                            </>
                        ) : (
                            <>
                                <i className={`tim-icons ${isHolding ? 'icon-button-pause' : 'icon-tap-02'} mr-2`} />
                                {confirmText || t("holdToConfirm") || "Držte pro potvrzení"}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );

    // Render using portal to body
    return ReactDOM.createPortal(modalContent, document.body);
}

export default HoldToConfirmModal;
