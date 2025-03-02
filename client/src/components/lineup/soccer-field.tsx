import { ReactNode } from 'react';

interface SoccerFieldProps {
  children: ReactNode;
}

export default function SoccerField({ children }: SoccerFieldProps) {
  return (
    <div className="w-full h-0 pb-[75%] bg-green-600 relative rounded-lg overflow-hidden">
      {/* Field markings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Center circle */}
        <div className="w-[30%] h-[40%] rounded-full border-2 border-white opacity-70" />
        
        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white opacity-70" />
        
        {/* Center spot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-white opacity-70" />
      </div>
      
      {/* Goal areas */}
      <div className="absolute top-[10%] left-[30%] right-[30%] h-[10%] border-2 border-white opacity-70" />
      <div className="absolute bottom-[10%] left-[30%] right-[30%] h-[10%] border-2 border-white opacity-70" />
      
      {/* Penalty areas */}
      <div className="absolute top-0 left-[20%] right-[20%] h-[20%] border-b-2 border-white opacity-70" />
      <div className="absolute bottom-0 left-[20%] right-[20%] h-[20%] border-t-2 border-white opacity-70" />
      
      {/* Goals */}
      <div className="absolute top-0 left-[40%] right-[40%] h-[2%] bg-white opacity-70" />
      <div className="absolute bottom-0 left-[40%] right-[40%] h-[2%] bg-white opacity-70" />
      
      {/* Corner arcs */}
      <div className="absolute top-0 left-0 w-[5%] h-[5%] border-r-2 border-b-2 rounded-br-full border-white opacity-70" />
      <div className="absolute top-0 right-0 w-[5%] h-[5%] border-l-2 border-b-2 rounded-bl-full border-white opacity-70" />
      <div className="absolute bottom-0 left-0 w-[5%] h-[5%] border-r-2 border-t-2 rounded-tr-full border-white opacity-70" />
      <div className="absolute bottom-0 right-0 w-[5%] h-[5%] border-l-2 border-t-2 rounded-tl-full border-white opacity-70" />
      
      {/* Children content (player positions) */}
      {children}
    </div>
  );
}