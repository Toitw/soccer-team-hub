import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="16" cy="16" r="15" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
      <path 
        d="M16 8L18.5 13L24 14L20 18L21 23.5L16 21L11 23.5L12 18L8 14L13.5 13L16 8Z" 
        fill="currentColor" 
      />
    </svg>
  );
}