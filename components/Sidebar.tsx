import React, { useState } from 'react';
import { Input, Select, TextArea } from './ui/Input';
import { Button } from './ui/Button';
import { LandingPageData, HistoryItem } from '../types';
import { Wand2, LayoutTemplate, History, Edit3, Clock, Save, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface SidebarProps {
  formData: LandingPageData;
  onChange: (field: keyof LandingPageData, value: any) => void;
  onGenerate: () => void;
  onSave: () => void;
  isGenerating: boolean;
  hasContent: boolean;
  history: HistoryItem[];
  onLoadHistory: (item: HistoryItem) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  formData, 
  onChange, 
  onGenerate, 
  onSave,
  isGenerating,
  hasContent,
  history,
  onLoadHistory,
  user,
  onLogin,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  
  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = value;
    onChange('benefits', newBenefits);
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <aside className="w-[400px] flex-shrink-0 bg-white border-r border-gray-200 h-screen overflow-hidden flex flex-col shadow-sm z-20">
      
      {/* Header & Auth */}
      <div className="p-5 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
              <LayoutTemplate className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">PageBuilder AI</h1>
          </div>
        </div>
        
        {/* Auth Section */}
        <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-center justify-between">
            {user && !user.isAnonymous ? (
              <div className="flex items-center gap-3 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-gray-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold text-gray-900 truncate">{user.displayName || 'User'}</span>
                  <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
                </div>
              </div>
            ) : (
               <div className="flex items-center gap-2 text-gray-500">
                 <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                   <UserIcon className="w-4 h-4 text-gray-500" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-xs font-semibold text-gray-700">Guest Mode</span>
                   <span className="text-[10px] text-gray-400">Sign in to save projects</span>
                 </div>
               </div>
            )}

            {user && !user.isAnonymous ? (
              <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Sign Out">
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={onLogin} 
                className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-medium transition-all shadow-sm flex items-center gap-1.5"
              >
                <LogIn className="w-3 h-3" />
                Sign In
              </button>
            )}
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'editor' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Editor
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'history' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            History
            {history.length > 0 && (
              <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'editor' ? (
          <div className="p-5 space-y-6">
            {/* Core Info */}
            <section className="space-y-4">
              <Input 
                label="Page Name" 
                placeholder="e.g., My First Sales Page" 
                value={formData.pageName}
                onChange={(e) => onChange('pageName', e.target.value)}
              />
              <Select 
                label="Landing Page Type"
                options={[
                  { value: 'General Sales', label: 'General Sales' },
                  { value: 'SaaS Product Launch', label: 'SaaS Product Launch' },
                  { value: 'Webinar Registration', label: 'Webinar Registration' },
                  { value: 'Lead Magnet / Ebook', label: 'Lead Magnet / Ebook' },
                  { value: 'Mobile App Showcase', label: 'Mobile App Showcase' },
                ]}
                value={formData.type}
                onChange={(e) => onChange('type', e.target.value)}
              />
              <TextArea 
                label="Offer / Product Description"
                placeholder="Describe your product in detail..."
                value={formData.description}
                onChange={(e) => onChange('description', e.target.value)}
                rows={4}
              />
              <TextArea 
                label="Target Audience"
                placeholder="Who is this for?"
                value={formData.targetAudience}
                onChange={(e) => onChange('targetAudience', e.target.value)}
                rows={2}
              />
            </section>

            {/* Benefits */}
            <section>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                3 Key Benefits
              </label>
              <div className="space-y-3">
                {formData.benefits.map((benefit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    placeholder={`Benefit ${idx + 1}`}
                    value={benefit}
                    onChange={(e) => handleBenefitChange(idx, e.target.value)}
                  />
                ))}
              </div>
            </section>

            {/* Customization */}
            <section className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-4 mt-4">
                <Wand2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Customization</h3>
              </div>
              
              <Select 
                label="Hero Layout"
                options={[
                  { value: 'centered', label: 'Centered Text & Image' },
                  { value: 'split', label: 'Split Screen (Left/Right)' },
                  { value: 'minimal', label: 'Minimalist Text Only' },
                ]}
                value={formData.heroLayout}
                onChange={(e) => onChange('heroLayout', e.target.value)}
              />
              
              <Select 
                label="Color Theme"
                options={[
                  { value: 'modern', label: 'Modern (Blue/Indigo)' },
                  { value: 'bold', label: 'Bold (Dark/High Contrast)' },
                  { value: 'elegant', label: 'Elegant (Serif/Gold)' },
                  { value: 'playful', label: 'Playful (Colorful)' },
                ]}
                value={formData.colorTheme}
                onChange={(e) => onChange('colorTheme', e.target.value)}
              />
            </section>
          </div>
        ) : (
          <div className="p-2">
            {history.length === 0 ? (
              <div className="text-center py-10 px-6">
                <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <History className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-medium mb-1">No history found</h3>
                <p className="text-sm text-gray-500">
                  {user && !user.isAnonymous 
                    ? "You haven't generated any pages yet." 
                    : "Sign in to save and access your history."}
                </p>
                <Button 
                  variant="ghost" 
                  className="mt-4 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  onClick={() => setActiveTab('editor')}
                >
                  Create New Page
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onLoadHistory(item);
                    }}
                    className="w-full text-left bg-white p-3 rounded-lg border border-transparent hover:border-indigo-100 hover:shadow-md hover:bg-gray-50 transition-all group group-hover:border-indigo-200"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-900 line-clamp-1">{item.data.pageName || 'Untitled Page'}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.data.description}</p>
                    <div className="flex items-center gap-2">
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                         {item.data.type}
                       </span>
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                         {item.data.colorTheme}
                       </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'editor' && (
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-3">
          <Button 
            onClick={onGenerate} 
            isLoading={isGenerating} 
            className="w-full h-11 text-base shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all"
            icon={<Wand2 className="w-4 h-4" />}
          >
            {isGenerating ? 'Generating...' : 'Generate Page Content'}
          </Button>
          
          <Button 
            onClick={onSave}
            variant="secondary"
            disabled={!hasContent || isGenerating}
            className="w-full"
            icon={<Save className="w-4 h-4" />}
          >
            Save This Page
          </Button>
        </div>
      )}
    </aside>
  );
};
