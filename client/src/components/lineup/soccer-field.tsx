import { ReactNode } from 'react';

interface SoccerFieldProps {
  children: ReactNode;
}

export default function SoccerField({ children }: SoccerFieldProps) {
  return (
    <div className="w-full h-0 pb-[75%] bg-gradient-to-b from-green-500 to-green-600 relative rounded-lg overflow-hidden border-2 border-white">
      {/* Field outline */}
      <div className="absolute inset-2 border-2 border-white opacity-60">
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[25%] h-[30%] rounded-full border-2 border-white opacity-60" />
        
        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white opacity-60" />
        
        {/* Center spot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[8px] h-[8px] rounded-full bg-white opacity-60" />
      </div>
      
      {/* Goals */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[20%] h-[3%] border-2 border-t-0 border-white opacity-80" />
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[20%] h-[3%] border-2 border-b-0 border-white opacity-80" />
      
      {/* Field zones */}
      <div className="absolute inset-0">
        <div className="absolute w-full h-[33%] top-0 border-b border-white border-dashed opacity-30"></div>
        <div className="absolute w-full h-[33%] bottom-[33%] border-b border-white border-dashed opacity-30"></div>
      </div>
      
      {/* Children content (player positions) */}
      {children}
    </div>
  );
}