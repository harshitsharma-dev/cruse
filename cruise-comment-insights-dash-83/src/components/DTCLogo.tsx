import React from 'react';

interface DTCLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DTCLogo: React.FC<DTCLogoProps> = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${sizeClasses[size]} apollo-gradient-secondary rounded-lg flex items-center justify-center apollo-shadow`}>
        <span className="text-white font-bold text-xs">DTC</span>
      </div>
      <span className={`font-semibold text-gray-700 ${textSizeClasses[size]}`}>
        DTC
      </span>
    </div>
  );
};

export default DTCLogo;
