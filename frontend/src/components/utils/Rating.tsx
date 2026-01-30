import React, { Fragment } from 'react';
import { FaStarHalf, FaStar, FaRegStar, FaRegStarHalf, FaStarHalfAlt } from 'react-icons/fa';

interface RatingProps {
    rating: number;
    maxStars?: number;
    sizeClass?: string;
}

const Rating: React.FC<RatingProps> = ({ rating, maxStars = 5, sizeClass = 'w-5 h-5' }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.01;
    const stars = [];

    for (let i = 1; i <= maxStars; i++) {
        if (i <= fullStars) {
            stars.push(<FaStar key={i} className={`${sizeClass} text-yellow-400`} />);
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars.push(<FaStarHalfAlt key={i} className={`${sizeClass} text-yellow-400`} />);
        } else {
            stars.push(<FaRegStar key={i} className={`${sizeClass} text-gray-400`} />);
        }
    }

    return <div className='flex space-x-1'>{stars}</div>;
};

export default Rating;
