import { ReactNode } from "react";

interface SoccerFieldProps {
  children: ReactNode;
}

export default function SoccerField({ children }: SoccerFieldProps) {
  return (
    <div className="relative w-full aspect-[3/4] bg-green-600 border-2 border-white rounded-lg overflow-hidden">
      {/* Field markings */}
      <div className="absolute inset-0">
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[30%] aspect-square rounded-full border-2 border-white"></div>
        
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white"></div>
        
        {/* Center spot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
        
        {/* Penalty areas */}
        {/* Top penalty area */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[60%] h-[20%] border-b-2 border-x-2 border-white"></div>
        
        {/* Bottom penalty area */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[60%] h-[20%] border-t-2 border-x-2 border-white"></div>
        
        {/* Goal areas */}
        {/* Top goal area */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[30%] h-[8%] border-b-2 border-x-2 border-white"></div>
        
        {/* Bottom goal area */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[30%] h-[8%] border-t-2 border-x-2 border-white"></div>
        
        {/* Penalty spots */}
        <div className="absolute top-[15%] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
        <div className="absolute bottom-[15%] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
        
        {/* Corner arcs */}
        <div className="absolute top-0 left-0 w-4 h-4 border-r-2 border-white rounded-bl-full"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-l-2 border-white rounded-br-full"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-r-2 border-white rounded-tl-full"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-l-2 border-white rounded-tr-full"></div>
      </div>
      
      {/* Goals */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-[20%] h-[2%] bg-white"></div>
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-[20%] h-[2%] bg-white"></div>
      
      {/* Field texture */}
      <div className="absolute inset-0 opacity-30">
        <div className="h-full w-full bg-[linear-gradient(0deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]"></div>
        <div className="h-full w-full bg-[linear-gradient(90deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]"></div>
      </div>
      
      {/* Children (player positions) */}
      {children}
    </div>
  );
}