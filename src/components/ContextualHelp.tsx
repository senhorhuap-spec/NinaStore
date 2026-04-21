import { HelpCircle, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ContextualHelpProps {
  title: string;
  description: string;
  className?: string;
  position?: 'bottom' | 'right';
}

export function ContextualHelp({ title, description, className, position = 'bottom' }: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const positionClasses = position === 'bottom' 
    ? "top-full mt-2 left-0 sm:left-1/2 sm:-translate-x-1/2" 
    : "left-full ml-2 top-1/2 -translate-y-1/2";

  return (
    <div className={cn("relative inline-flex items-center", className)} ref={popoverRef}>
      <button 
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "p-1.5 rounded-full transition-colors flex items-center justify-center cursor-pointer",
          isOpen ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
        )}
        aria-label="Dúvidas e Ajuda"
      >
        <HelpCircle size={18} strokeWidth={2.5} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: position === 'bottom' ? 10 : 0, x: position === 'right' ? -10 : 0, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-[100] w-64 bg-slate-800 text-white p-4 rounded-2xl shadow-xl border border-slate-700",
              positionClasses
            )}
          >
            <div className="flex justify-between items-start gap-2 mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-300">{title}</span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-sm font-medium leading-relaxed opacity-90">{description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
