import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PreviewToolbar } from './components/PreviewToolbar';
import { PreviewWindow } from './components/PreviewWindow';
import { AuthPage } from './components/AuthPage';
import { LandingPageData, INITIAL_FORM_STATE, DeviceType, HistoryItem } from './types';
import { generateLandingPage } from './services/geminiService';
import { saveProjectToFirestore, fetchProjectsFromFirestore, subscribeToAuth, logoutUser } from './services/firebase';
import { CheckCircle2, AlertCircle, WifiOff, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { User } from 'firebase/auth';

const App: React.FC = () => {
  const [formData, setFormData] = useState<LandingPageData>(INITIAL_FORM_STATE);
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Subscribe to auth state and load history
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      // Only load history if we have a user (real or guest). 
      // This prevents auto-guest-login on initial load, letting the AuthPage show first.
      if (currentUser) {
        loadHistory();
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadHistory = async () => {
    try {
      const projects = await fetchProjectsFromFirestore();
      setHistory(projects);
    } catch (error) {
      console.error("Failed to load history:", error);
      // Fallback to local storage if DB fails completely
      const local = localStorage.getItem('local_history');
      if (local) setHistory(JSON.parse(local));
    }
  };

  const handleFormChange = (field: keyof LandingPageData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = async () => {
    await logoutUser();
    // History clearing handled by useEffect based on user state
    showNotification('Signed out.', 'success');
  };

  // Centralized save function used by auto-save and manual save
  const saveToHistoryAndDb = async (html: string, data: LandingPageData, isManual = false) => {
    let savedItem: HistoryItem;

    // Try Save to Firestore
    try {
      savedItem = await saveProjectToFirestore(data, html);
      if (isManual) {
        showNotification('Page saved successfully!', 'success');
      } else {
        showNotification('Page generated and auto-saved!', 'success');
      }
    } catch (dbError) {
      console.warn("Firestore save failed, falling back to local storage.", dbError);
      
      // Fallback: Create local item
      savedItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: { ...data },
        html: html
      };
      const msg = isManual ? 'Page saved locally (Offline Mode)' : 'Page generated (Offline Mode)';
      showNotification(msg, 'warning');
    }

    // Update State & Local Storage Backup
    const newHistory = [savedItem, ...history];
    setHistory(newHistory);
    localStorage.setItem('local_history', JSON.stringify(newHistory.slice(0, 20))); // Keep last 20 locally
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedHtml(''); 
    
    try {
      const html = await generateLandingPage(formData);
      setGeneratedHtml(html);
      
      // Auto-save the generated content to Firestore (or local fallback)
      await saveToHistoryAndDb(html, formData, false);

    } catch (error) {
      console.error(error);
      showNotification('Failed to generate page. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualSave = async () => {
    if (!generatedHtml) {
      showNotification('Nothing to save. Generate a page first!', 'error');
      return;
    }
    await saveToHistoryAndDb(generatedHtml, formData, true);
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setFormData(item.data);
    setGeneratedHtml(item.html);
    showNotification('Previous version loaded.', 'success');
  };

  const handleSave = async () => {
    if (!generatedHtml) {
      showNotification('Generate a page first!', 'error');
      return;
    }

    try {
      showNotification('Preparing project download...', 'success');
      
      const zip = new JSZip();
      
      // Create project folder structure
      const projectName = formData.pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'landing-page';
      const root = zip.folder(projectName);

      if (!root) throw new Error("Failed to create zip folder");

      // Parse HTML to separate concerns (HTML/CSS/JS)
      const parser = new DOMParser();
      const doc = parser.parseFromString(generatedHtml, 'text/html');

      // 1. Extract CSS
      let cssContent = '/* \n * Custom Styles\n * Extracted from generated landing page\n */\n\n';
      const styleTags = doc.querySelectorAll('style');
      styleTags.forEach((tag) => {
        cssContent += tag.innerHTML + '\n\n';
        tag.remove();
      });

      // Add external link to CSS if we extracted anything or just to have the file
      const linkTag = doc.createElement('link');
      linkTag.rel = 'stylesheet';
      linkTag.href = 'css/styles.css';
      doc.head.appendChild(linkTag);
      
      // Create css folder and file
      root.folder('css')?.file('styles.css', cssContent);

      // 2. Extract JS
      let jsContent = '// Custom Scripts\n\n';
      const scriptTags = doc.querySelectorAll('script');
      
      scriptTags.forEach((tag) => {
        // Skip external scripts (like Tailwind CDN) and import maps
        if (!tag.src && !tag.type?.includes('importmap') && !tag.type?.includes('module')) {
          jsContent += tag.innerHTML + '\n\n';
          tag.remove();
        }
      });

      // Add link to new JS file
      const scriptLink = doc.createElement('script');
      scriptLink.src = 'js/scripts.js';
      doc.body.appendChild(scriptLink);

      // Create js folder and file
      root.folder('js')?.file('scripts.js', jsContent);

      // 3. Create Assets folder
      root.folder('assets');

      // 4. Create HTML file
      // Prepend DOCTYPE as outerHTML doesn't include it
      const finalHtml = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
      root.file('index.html', finalHtml);

      // 5. Create README
      const readmeContent = `# ${formData.pageName}

Generated by Landing Page AI Builder

## Project Structure
- index.html: Main entry point
- css/styles.css: Custom styles (Tailwind is loaded via CDN)
- js/scripts.js: Custom interactivity
- assets/: Place your images here

## Customization
To edit the content, open index.html in any code editor.
To change styles, you can add standard CSS to css/styles.css or add Tailwind classes in index.html.
`;
      root.file('README.md', readmeContent);

      // Generate ZIP
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}-project.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('Project folder downloaded!', 'success');

    } catch (error) {
      console.error('Download failed:', error);
      showNotification('Failed to generate zip file.', 'error');
    }
  };

  const handlePreview = () => {
    if (!generatedHtml) {
      showNotification('Generate a page first!', 'error');
      return;
    }
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(generatedHtml);
      newWindow.document.close();
    } else {
      showNotification('Pop-up blocked. Allow pop-ups to see preview.', 'error');
    }
  };

  const handleDeploy = () => {
    if (!generatedHtml) {
      showNotification('Generate a page first!', 'error');
      return;
    }
    const deployBtn = document.activeElement as HTMLElement;
    if(deployBtn) deployBtn.blur();
    
    showNotification('Deployment started... (Mock)', 'success');
    setTimeout(() => {
      showNotification('🚀 Site is live at https://mock-deploy.com/' + Math.random().toString(36).substring(7), 'success');
    }, 1500);
  };

  const getNotificationStyles = (type: string) => {
    switch(type) {
      case 'success': return 'bg-white border-green-200 text-green-800';
      case 'warning': return 'bg-white border-amber-200 text-amber-800';
      case 'error': return 'bg-white border-red-200 text-red-800';
      default: return 'bg-white border-gray-200 text-gray-800';
    }
  };

  // --------------------------------------------------------------------------
  // Render Logic
  // --------------------------------------------------------------------------

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // If NOT authenticated, show the Auth Page
  if (!user) {
    return <AuthPage onSuccess={() => {/* Handled by auth listener */}} />;
  }

  // If authenticated, show the Builder App
  return (
    <div className="flex h-screen bg-white font-sans text-gray-900">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl transform transition-all animate-in fade-in slide-in-from-top-5 duration-300 border ${getNotificationStyles(notification.type)}`}>
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
          {notification.type === 'warning' && <WifiOff className="w-5 h-5 text-amber-600" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Left Sidebar - Form */}
      <Sidebar 
        formData={formData} 
        onChange={handleFormChange} 
        onGenerate={handleGenerate}
        onSave={handleManualSave}
        isGenerating={isGenerating}
        hasContent={!!generatedHtml}
        history={history}
        onLoadHistory={handleLoadHistory}
        user={user}
        onLogin={() => {}} // User is already logged in if we are here
        onLogout={handleLogout}
      />

      {/* Right Area - Preview */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        <PreviewToolbar 
          device={device} 
          setDevice={setDevice} 
          onSave={handleSave}
          onDeploy={handleDeploy}
          onPreview={handlePreview}
        />
        <PreviewWindow 
          html={generatedHtml} 
          device={device}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
};

export default App;