import React, { useState, KeyboardEvent } from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar, FaThumbsDown } from 'react-icons/fa';
import Tooltip from '../ui/Tooltip';

interface RatingInputProps {
    /** Valor actual (controlado) */
    rating?: number;
    /** Valor inicial (no controlado) */
    defaultValue?: number;
    /** Máximo de estrellas */
    maxStars?: number;
    /** Tamaño Tailwind */
    sizeClass?: string;
    /** ¿Editable? (por defecto true) */
    editable?: boolean;
    /** Callback cuando cambia la puntuación */
    onChange?: (newRating: number) => void;
    thumb?: boolean;
}

const RatingInput: React.FC<RatingInputProps> = ({
    rating,
    defaultValue = 0,
    maxStars = 5,
    sizeClass = 'w-8 h-8',
    editable = true,
    onChange,
    thumb = true,
}) => {
    // Si es controlado, usamos rating; si no, estado interno
    const [internalRating, setInternalRating] = useState(defaultValue);
    const [hoverRating, setHoverRating] = useState<number | null>(null);

    const displayRating = hoverRating ?? (rating ?? internalRating);

    const updateRating = (newRating: number) => {
        if (!editable) return;
        if (onChange) {
            onChange(newRating);
        } else {
            setInternalRating(newRating);
        }
    };

    const handleKey = (e: KeyboardEvent, idx: number) => {
        if (!editable) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            updateRating(idx);
        }
    };

    const stars = [];
    const fullStars = Math.floor(displayRating);
    const hasHalf = displayRating - fullStars >= 0.5;

    for (let i = 1; i <= maxStars; i++) {
        let Icon = FaRegStar;
        if (i <= fullStars) {
            Icon = FaStar;
        } else if (i === fullStars + 1 && hasHalf) {
            Icon = FaStarHalfAlt;
        }

        stars.push(
            <Tooltip
                key={i}
                placement='bottom'
                text={
                    i === 1
                        ? 'Muy Deficiente'
                        : i === 2
                          ? 'Deficiente'
                          : i === 3
                            ? 'Aceptable'
                            : i === 4
                              ? 'Muy Bueno'
                              : i === 5
                                ? 'Excelente'
                                : ''
                }>
                <span
                    className={`cursor-${editable ? 'pointer' : 'default'}`}
                    onClick={() => updateRating(i)}
                    onMouseEnter={() => editable && setHoverRating(i)}
                    onMouseLeave={() => editable && setHoverRating(null)}
                    onKeyDown={(e) => handleKey(e, i)}
                    role={editable ? 'slider' : undefined}
                    aria-valuenow={displayRating}
                    aria-valuemin={0}
                    aria-valuemax={maxStars}
                    tabIndex={editable ? 0 : undefined}>
                    <Icon
                        className={`${sizeClass} ${i <= displayRating ? 'text-yellow-400' : 'text-gray-300'}`}
                    />
                </span>
            </Tooltip>,
        );
    }

    return (
        <div className='flex items-center space-x-1'>
            {thumb && (
                <Tooltip key={'mal'} placement='bottom' text='Pesimo Trabajo'>
                    <span
                        className={`mr-10 cursor-${editable ? 'pointer' : 'default'}`}
                        onClick={() => {
                            updateRating(0);
                        }}>
                        <FaThumbsDown className={`${sizeClass} text-red-500`}></FaThumbsDown>
                    </span>
                </Tooltip>
            )}
            {stars}
        </div>
    );
};

export default RatingInput;
