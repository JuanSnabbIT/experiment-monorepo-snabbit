import { TBorderWidth } from '@/types/borderWidth.type';
import { TRounded } from '@/types/rounded.type';
import classNames from 'classnames';
import React, { forwardRef, useRef } from 'react';
import Label from './Label';

export interface IFileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    id: string;
    name: string;
    label?: string;
    accept?: string;
    className?: string;
    borderWidth?: TBorderWidth;
    rounded?: TRounded;
    selectedFile?: File | null;
    onFileSelect?: (file: File | null) => void;
}

/**
 * FileInput component - Styled file input consistent with other form components
 * Provides visual feedback for selected files
 */
const FileInput = forwardRef<HTMLInputElement, IFileInputProps>((props, ref) => {
    const {
        id,
        name,
        label,
        accept = 'application/pdf',
        className,
        borderWidth = 'border-2',
        rounded = 'rounded-lg',
        selectedFile,
        onFileSelect,
        onChange,
        disabled,
        ...rest
    } = props;

    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        onFileSelect?.(file);
        onChange?.(e);
    };

    const handleClear = () => {
        if (inputRef.current) {
            inputRef.current.value = '';
        }
        onFileSelect?.(null);
    };

    const baseClasses = classNames(
        'block w-full px-3 py-2 text-sm transition-colors',
        rounded,
        borderWidth,
        {
            'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300':
                !disabled,
            'cursor-not-allowed opacity-50 bg-zinc-100 dark:bg-zinc-900': disabled,
        },
        className,
    );

    return (
        <div>
            {label && <Label htmlFor={id}>{label}</Label>}
            <div className='relative'>
                <input
                    ref={inputRef}
                    id={id}
                    name={name}
                    type='file'
                    accept={accept}
                    className={baseClasses}
                    onChange={handleChange}
                    disabled={disabled}
                    {...rest}
                />
                {selectedFile && (
                    <div className='mt-2 flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50'>
                        <div className='flex items-center gap-2'>
                            <svg
                                className='h-4 w-4 text-zinc-400 dark:text-zinc-500'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'>
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                />
                            </svg>
                            <span className='text-sm text-zinc-700 dark:text-zinc-300'>
                                {selectedFile.name}
                            </span>
                            <span className='text-xs text-zinc-400 dark:text-zinc-500'>
                                ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                        {!disabled && (
                            <button
                                type='button'
                                onClick={handleClear}
                                className='text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300'>
                                <svg
                                    className='h-4 w-4'
                                    fill='none'
                                    viewBox='0 0 24 24'
                                    stroke='currentColor'>
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M6 18L18 6M6 6l12 12'
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

FileInput.displayName = 'FileInput';

export default FileInput;
