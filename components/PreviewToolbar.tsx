import React from 'react';
import { Monitor, Tablet, Smartphone, Download, Eye, Rocket, Globe } from 'lucide-react';
import { Button } from './ui/Button';
import { DeviceType } from '../types';

interface PreviewToolbarProps {
  device: DeviceType;
  setDevice: (d: DeviceType) => void;
  onSave: () => void;
  onDeploy: () => void;
  onPreview: () => void;
  publicUrl?: string; // Optional URL for the live button
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({ device, setDevice, onSave, onDeploy, onPreview, publicUrl }) => {
  
  const handleLiveUrlClick = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  return (
    <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] z-10 relative">
      <div className="flex items-center gap-4">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Editor Mode</span>
        
        <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1 border border-gray-200">
          <button
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded-md transition-all ${device === 'desktop' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}
            title="Desktop View"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-1.5 rounded-md transition-all ${device === 'tablet' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}
            title="Tablet View"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded-md transition-all ${device === 'mobile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {publicUrl && (
          <Button 
            variant="ghost" 
            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
            onClick={handleLiveUrlClick} 
            icon={<Globe className="w-4 h-4"/>}
          >
             Live URL
          </Button>
        )}
        <Button variant="ghost" onClick={onPreview} icon={<Eye className="w-4 h-4"/>}>
           Preview
        </Button>
        <Button variant="secondary" onClick={onSave} icon={<Download className="w-4 h-4"/>}>
           Download Code
        </Button>
        {/* Deprecated 'Deploy' button in favor of auto-save + Live URL, but keeping for UI consistency if needed */}
      </div>
    </div>
  );
};
