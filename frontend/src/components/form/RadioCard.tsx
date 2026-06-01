import { TBorderWidth } from '@/types/borderWidth.type';
import { TColors } from '@/types/colors.type';
import { TIcons } from '@/types/icons.type';
import { TRounded } from '@/types/rounded.type';
import classNames from 'classnames';
import React, { forwardRef, ReactNode } from 'react';
import Icon from '../icon/Icon';

export interface IRadioCardProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    name: string;
    value: string;
    children: ReactNode;
    className?: string;
    color?: TColors;
    borderWidth?: TBorderWidth;
    rounded?: TRounded;
    icon?: TIcons;
    iconClassName?: string;
}

/**
 * RadioCard component - Styled radio button that looks like a clickable card
 * Consistent with Button component design system
 */
const RadioCard = forwardRef<HTMLInputElement, IRadioCardProps>((props, ref) => {
    const {
        id,
        name,
        value,
        children,
        className,
        color = 'zinc',
        borderWidth = 'border-2',
        rounded = 'rounded-lg',
        icon,
        iconClassName,
        checked,
        onChange,
        disabled,
        ...rest
    } = props;

    const baseClasses = classNames(
        'relative flex cursor-pointer items-center gap-3 px-4 py-3 transition-all duration-200',
        rounded,
        borderWidth,
        {
            // Checked state
            'border-blue-500 bg-blue-50 dark:bg-blue-900/20': checked && !disabled,
            // Unchecked state
            'border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600':
                !checked && !disabled,
            // Disabled state
            'cursor-not-allowed opacity-50': disabled,
        },
        className,
    );

    return (
        <label htmlFor={id} className={baseClasses}>
            <input
                ref={ref}
                type='radio'
                id={id}
                name={name}
                value={value}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className='peer sr-only'
                {...rest}
            />
            {icon && (
                <Icon
                    icon={icon}
                    className={classNames(
                        'text-2xl transition-colors',
                        {
                            'text-blue-500': checked && !disabled,
                            'text-zinc-400 dark:text-zinc-500': !checked && !disabled,
                        },
                        iconClassName,
                    )}
                />
            )}
            <div className='flex-1'>{children}</div>
            {/* Checkmark indicator when selected */}
            {checked && !disabled && (
                <svg
                    className='h-5 w-5 flex-shrink-0 text-blue-500'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'>
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                    />
                </svg>
            )}
        </label>
    );
});

RadioCard.displayName = 'RadioCard';

export default RadioCard;
