import React from 'react';

interface DTCLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DTCLogo: React.FC<DTCLogoProps> = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-auto',
    md: 'h-8 w-auto',
    lg: 'h-10 w-auto'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${sizeClasses[size]}`}>        <img 
          src="https://ap-grp-ai.s3.us-west-2.amazonaws.com/assets/dtc-logo.png" 
          alt="DTC"
          className={`${sizeClasses[size]} object-contain rounded apollo-shadow`}
        />
      </div>
      <span className={`font-semibold text-gray-700 ${textSizeClasses[size]}`}>
        DTC
      </span>
    </div>
  );
};

export default DTCLogo;
