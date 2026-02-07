import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  /** Tooltip content shown on hover/focus */
  content: React.ReactNode;
  /** Trigger element(s) */
  children: React.ReactNode;
  /** Optional placement relative to trigger */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Optional delay before showing (ms) */
  delayShow?: number;
  /** Optional delay before hiding (ms) */
  delayHide?: number;
  /** Optional class for the trigger wrapper */
  className?: string;
}

export function Tooltip({
  content,
  children,
  placement = 'left',
  delayShow = 150,
  delayHide = 0,
  className,
}: TooltipProps) {
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = React.useState(false);
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const showTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const padding = 8;
    switch (placement) {
      case 'top':
        setCoords({
          x: rect.left + rect.width / 2,
          y: rect.top - padding,
        });
        break;
      case 'bottom':
        setCoords({
          x: rect.left + rect.width / 2,
          y: rect.bottom + padding,
        });
        break;
      case 'left':
        setCoords({
          x: rect.left - padding,
          y: rect.top + rect.height / 2,
        });
        break;
      case 'right':
        setCoords({
          x: rect.right + padding,
          y: rect.top + rect.height / 2,
        });
        break;
      default:
        setCoords({ x: rect.left + rect.width / 2, y: rect.top - padding });
    }
  }, [placement]);

  const getPortalTransform = () => {
    switch (placement) {
      case 'top':
        return 'translate(-50%, -100%)';
      case 'bottom':
        return 'translate(-50%, 0)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'right':
        return 'translate(0, -50%)';
      default:
        return 'translate(-50%, -100%)';
    }
  };

  const show = React.useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    showTimeoutRef.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
      showTimeoutRef.current = null;
    }, delayShow);
  }, [delayShow, updatePosition]);

  const hide = React.useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      hideTimeoutRef.current = null;
    }, delayHide);
  }, [delayHide]);

  React.useEffect(() => {
    if (visible) {
      updatePosition();
      const onScrollOrResize = () => updatePosition();
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
      return () => {
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
      };
    }
  }, [visible, updatePosition]);

  React.useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const tooltipContent = visible ? (
    <div
      role="tooltip"
      className={cn(
        'fixed z-[100] w-44 lg:w-72 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal',
        'transition-opacity duration-150 opacity-100'
      )}
      style={{
        left: coords.x,
        top: coords.y,
        transform: getPortalTransform(),
        marginBottom: placement === 'top' ? -8 : 0,
        marginTop: placement === 'bottom' ? -8 : 0,
        marginRight: placement === 'left' ? -8 : 0,
        marginLeft: placement === 'right' ? -8 : 0,
      }}
    >
      {content}
      {/* Arrow */}
      <span
        className={cn(
          'absolute w-2 h-2 bg-gray-900 rotate-45',
          placement === 'top' && 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2',
          placement === 'bottom' && 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2',
          placement === 'left' && 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2',
          placement === 'right' && 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2'
        )}
      />
    </div>
  ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={cn('inline-block', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {visible &&
        createPortal(
          <div className="fixed inset-0 pointer-events-none z-[99]">
            {tooltipContent}
          </div>,
          document.body
        )}
    </>
  );
}
