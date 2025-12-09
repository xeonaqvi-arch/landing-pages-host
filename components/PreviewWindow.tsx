import React from 'react';
import { DeviceType } from '../types';
import { Loader2 } from 'lucide-react';

interface PreviewWindowProps {
  html: string;
  device: DeviceType;
  isGenerating: boolean;
}

export const PreviewWindow: React.FC<PreviewWindowProps> = ({ html, device, isGenerating }) => {
  
  const getWidth = () => {
    switch (device) {
      case 'mobile': return 'max-w-[375px]';
      case 'tablet': return 'max-w-[768px]';
      default: return 'max-w-full';
    }
  };

  return (
    <div className="flex-1 bg-slate-100 relative overflow-hidden flex flex-col items-center justify-center p-8">
      
      {/* Device Frame */}
      <div className={`transition-all duration-500 ease-in-out w-full h-full bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-300 relative flex flex-col ${getWidth()} ${device !== 'desktop' ? 'my-4 h-[90%]' : 'h-full'}`}>
        
        {/* Browser Top Bar for visual flair */}
        <div className="h-8 bg-slate-50 border-b border-slate-200 flex items-center px-4 space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
          <div className="flex-1 text-center">
            <div className="bg-white border border-slate-200 rounded text-[10px] text-slate-400 px-2 py-0.5 mx-auto max-w-[200px] truncate">
              preview.generated-site.com
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-white w-full">
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20">
               <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-100 animate-pulse"></div>
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
               </div>
               <p className="mt-4 text-slate-500 font-medium animate-pulse">Designing your layout...</p>
               <p className="text-xs text-slate-400 mt-2">Writing Tailwind classes...</p>
            </div>
          ) : !html ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
               <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl mb-4 flex items-center justify-center">
                  <span className="text-2xl opacity-50">✨</span>
               </div>
               <p className="font-medium">Ready to create magic</p>
               <p className="text-sm mt-1 max-w-xs text-center">Fill out the details on the left and hit Generate to see your landing page appear here.</p>
            </div>
          ) : (
            <iframe
              title="Preview"
              srcDoc={html}
              className="w-full h-full border-none"
              sandbox="allow-scripts" 
            />
          )}
        </div>
      </div>
    </div>
  );
};