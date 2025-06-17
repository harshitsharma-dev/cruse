import React from 'react';

interface ApolloLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

const ApolloLogo: React.FC<ApolloLogoProps> = ({ size = 'md', variant = 'full', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl'
  };

  if (variant === 'icon') {
    return (
      <div className={`${sizeClasses[size]} apollo-gradient-primary rounded-2xl flex items-center justify-center apollo-shadow ${className}`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="w-3/5 h-3/5 text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Apollo rocket/ship icon */}
          <path 
            d="M12 2L13.09 8.26L19 9L13 11L12 17L11 11L5 9L10.91 8.26L12 2Z" 
            fill="currentColor"
          />
          <path 
            d="M12 17L8 21V18L12 17Z" 
            fill="currentColor"
            opacity="0.7"
          />
          <path 
            d="M12 17L16 21V18L12 17Z" 
            fill="currentColor"
            opacity="0.7"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`${className}`}>
        <h1 className={`${textSizeClasses[size]} font-bold apollo-text-gradient`}>
          Apollo
        </h1>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizeClasses[size]} apollo-gradient-primary rounded-2xl flex items-center justify-center apollo-shadow apollo-animate-float`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="w-3/5 h-3/5 text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 2L13.09 8.26L19 9L13 11L12 17L11 11L5 9L10.91 8.26L12 2Z" 
            fill="currentColor"
          />
          <path 
            d="M12 17L8 21V18L12 17Z" 
            fill="currentColor"
            opacity="0.7"
          />
          <path 
            d="M12 17L16 21V18L12 17Z" 
            fill="currentColor"
            opacity="0.7"
          />
        </svg>
      </div>
      <div>
        <h1 className={`${textSizeClasses[size]} font-bold apollo-text-gradient`}>
          Apollo
        </h1>
        <p className="text-sm text-gray-600 font-medium">
          Cruise Analytics Platform
        </p>
      </div>
    </div>
  );
};

export default ApolloLogo;
