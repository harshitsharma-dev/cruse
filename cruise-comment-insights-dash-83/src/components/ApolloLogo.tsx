import React from 'react';

interface ApolloLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

const ApolloLogo: React.FC<ApolloLogoProps> = ({ size = 'md', variant = 'full', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-12 w-auto',
    lg: 'h-16 w-auto',
    xl: 'h-24 w-auto'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl'
  };  if (variant === 'icon') {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <img 
          src="https://ap-grp-ai.s3.us-west-2.amazonaws.com/assets/ag-logo.svg" 
          alt="Apollo Intelligence"
          className={`${sizeClasses[size]} object-contain rounded-lg apollo-shadow`}
        />
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
  }  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizeClasses[size]}`}>
        <img 
          src="https://ap-grp-ai.s3.us-west-2.amazonaws.com/assets/ag-logo.svg" 
          alt="Apollo Intelligence"
          className={`${sizeClasses[size]} object-contain rounded-lg apollo-shadow apollo-animate-float`}
        />
      </div>
      <div>
        <h1 className={`${textSizeClasses[size]} font-bold apollo-text-gradient`}>
          Apollo Intelligence
        </h1>
        <p className="text-sm text-gray-600 font-medium">
          Cruise Analytics Platform
        </p>
      </div>
    </div>
  );
};

export default ApolloLogo;
