import React, { FC, ReactNode } from 'react';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';
import classNames from 'classnames';

interface ICollapseProps extends MotionProps {
    children: ReactNode;
    className?: string;
    isOpen?: boolean;
    direction?: 'vertical' | 'horizontal';
}

const Collapse: FC<ICollapseProps> = (props) => {
    const { children, isOpen = false, className, direction = 'vertical', ...rest } = props;

    const variants = {
        open:
            direction === 'vertical'
                ? { opacity: 1, height: 'auto' }
                : { opacity: 1, width: 'auto' },
        collapsed: direction === 'vertical' ? { opacity: 0, height: 0 } : { opacity: 0, width: 0 },
    };

    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    data-component-name='Collapse'
                    key='content'
                    initial='collapsed'
                    animate='open'
                    exit='collapsed'
                    variants={variants}
                    transition={{
                        duration: 0.8,
                        ease: [0.04, 0.62, 0.23, 0.98],
                    }}
                    className={classNames('overflow-hidden', className)}
                    {...rest}>
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Collapse;
