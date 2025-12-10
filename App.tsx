import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PreviewToolbar } from './components/PreviewToolbar';
import { PreviewWindow } from './components/PreviewWindow';
import { AuthPage } from './components/AuthPage';
import { LandingPageData, INITIAL_FORM_STATE, DeviceType, HistoryItem } from './types';
import { generateLandingPage } from './services/geminiService';
import { saveProjectToFirestore, fetchProjectsFromFirestore, subscribeToAuth, logoutUser, fetchPublicPage } from './services/firebase';
import { CheckCircle2, AlertCircle, WifiOff, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { User } from 'firebase/auth';

const App: React.FC = () => {
  // Routing State
  const [isPublicView, setIsPublicView] = useState(false);
  const [publicHtml, setPublicHtml] = useState<string | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);

  // App State
  const [formData, setFormData] = useState<LandingPageData>(INITIAL_FORM_STATE);
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentLiveUrl, setCurrentLiveUrl] = useState<string>('');

  // Check for Public Viewer Route
  useEffect(() => {
    // Handle path-based routing: /userId/pageId.html
    const pathSegments = window.location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    let uid: string | null = null;
    let pageId: string | null = null;

    if (pathSegments.length >= 2) {
      uid = pathSegments[0];
      pageId = pathSegments[1];
    } 
    
    // Handle query params fallback (if used)
    if (!uid || !pageId) {
      const params = new URLSearchParams(window.location.search);
      const qUid = params.get('uid');
      const qPage = params.get('page');
      if (qUid) uid = qUid;
      if (qPage) pageId = qPage;
    }

    // STRICT CHECK: Only enter public view if pageId looks like our generated files (.html)
    // This prevents false positives during development or if the app is hosted on a subpath
    if (uid && pageId && pageId.endsWith('.html')) {
      setIsPublicView(true);
      setPublicLoading(true);
      
      console.log(`Loading public page: ${uid} / ${pageId}`);
      
      fetchPublicPage(uid, pageId).then((html) => {
        setPublicHtml(html);
        setPublicLoading(false);
      });
    }
  }, []);

  // Subscribe to auth state and load history
  useEffect(() => {
    if (isPublicView) {
      setAuthLoading(false); // Skip auth check for public viewers
      return;
    }

    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      // Load history if user is present (Mock or Real)
      if (currentUser) {
        loadHistory();
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, [isPublicView]);

  const loadHistory = async () => {
    try {
      const projects = await fetchProjectsFromFirestore();
      const local = localStorage.getItem('local_history');
      const localItems = local ? JSON.parse(local) : [];
      
      if (projects.length > 0) {
        setHistory(projects);
      } else {
        setHistory(localItems);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
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
    showNotification('Signed out.', 'success');
  };

  // Centralized save function used by auto-save and manual save
  const saveToHistoryAndDb = async (html: string, data: LandingPageData, isManual = false) => {
    let savedItem: HistoryItem;

    try {
      savedItem = await saveProjectToFirestore(data, html);
      
      // Use the URL returned from the save function
      if (savedItem.liveUrl) {
        setCurrentLiveUrl(savedItem.liveUrl);
      }

      const msg = isManual ? 'Page saved to Database!' : 'Page generated & saved!';
      showNotification(msg, 'success');
    } catch (dbError: any) {
      const isOfflineMode = user?.uid.startsWith('offline_');
      const isPermissionIssue = dbError.message === 'permission-denied' || dbError.code === 'permission-denied';
      
      savedItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: { ...data },
        html: html
      };

      // In offline mode, we cannot have a live URL
      setCurrentLiveUrl('');

      const msg = isManual ? 'Page saved (Local Only)' : 'Page generated (Local Only)';
      showNotification(msg, (isOfflineMode || isPermissionIssue) ? 'success' : 'warning');
    }

    const newHistory = [savedItem, ...history];
    setHistory(newHistory);
    localStorage.setItem('local_history', JSON.stringify(newHistory.slice(0, 20)));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedHtml(''); 
    setCurrentLiveUrl('');
    
    try {
      const html = await generateLandingPage(formData);
      setGeneratedHtml(html);
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
    
    // Use the liveUrl from the item if available, otherwise reconstruct it or clear it
    if (item.liveUrl) {
      setCurrentLiveUrl(item.liveUrl);
    } else if (user && item.id.endsWith('.html')) {
      // Fallback reconstruction for older items
      const liveUrl = `https://landing-pages-host.vercel.app/${user.uid}/${item.id}`;
      setCurrentLiveUrl(liveUrl);
    } else {
      setCurrentLiveUrl('');
    }

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
      const projectName = formData.pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'landing-page';
      const root = zip.folder(projectName);

      if (!root) throw new Error("Failed to create zip folder");

      const parser = new DOMParser();
      const doc = parser.parseFromString(generatedHtml, 'text/html');

      // 1. Extract CSS
      let cssContent = '/* \n * Custom Styles\n * Extracted from generated landing page\n */\n\n';
      const styleTags = doc.querySelectorAll('style');
      styleTags.forEach((tag) => {
        cssContent += tag.innerHTML + '\n\n';
        tag.remove();
      });

      const linkTag = doc.createElement('link');
      linkTag.rel = 'stylesheet';
      linkTag.href = 'css/styles.css';
      doc.head.appendChild(linkTag);
      
      root.folder('css')?.file('styles.css', cssContent);

      // 2. Extract JS
      let jsContent = '// Custom Scripts\n\n';
      const scriptTags = doc.querySelectorAll('script');
      
      scriptTags.forEach((tag) => {
        if (!tag.src && !tag.type?.includes('importmap') && !tag.type?.includes('module')) {
          jsContent += tag.innerHTML + '\n\n';
          tag.remove();
        }
      });

      const scriptLink = doc.createElement('script');
      scriptLink.src = 'js/scripts.js';
      doc.body.appendChild(scriptLink);

      root.folder('js')?.file('scripts.js', jsContent);
      root.folder('assets');

      const finalHtml = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
      root.file('index.html', finalHtml);

      const readmeContent = `# ${formData.pageName}\n\nGenerated by Landing Page AI Builder`;
      root.file('README.md', readmeContent);

      const blob = await zip.generateAsync({ type: 'blob' });
      
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
    // Just a placeholder for "Deploy" if not using the Live URL feature
    showNotification('Your page is auto-saved to the Live URL!', 'success');
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
  // PUBLIC VIEWER MODE
  // --------------------------------------------------------------------------
  if (isPublicView) {
    if (publicLoading) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading Page...</p>
        </div>
      );
    }
    
    if (!publicHtml) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h1>
            <p className="text-gray-500 mb-6">
              The page you are looking for does not exist or you do not have permission to view it.
            </p>
            <div className="text-xs text-gray-400 border-t pt-4 border-gray-100 text-left">
               <p className="font-semibold mb-1">Troubleshooting:</p>
               <ul className="list-disc pl-4 space-y-1">
                 <li>Ensure <strong>Firestore Rules</strong> allow public read access.</li>
                 <li>If you are the developer, verify you have <strong>re-deployed</strong> the latest code to Vercel.</li>
                 <li>Check that the URL is correct.</li>
               </ul>
            </div>
            <a href="/" className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors w-full">
              Go to Homepage
            </a>
          </div>
        </div>
      );
    }

    // Render the raw HTML
    return (
      <iframe 
        srcDoc={publicHtml} 
        style={{ width: '100vw', height: '100vh', border: 'none' }} 
        title="Public Page"
      />
    );
  }

  // --------------------------------------------------------------------------
  // EDITOR APP MODE
  // --------------------------------------------------------------------------

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={() => {}} />;
  }

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900">
      
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl transform transition-all animate-in fade-in slide-in-from-top-5 duration-300 border ${getNotificationStyles(notification.type)}`}>
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
          {notification.type === 'warning' && <WifiOff className="w-5 h-5 text-amber-600" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

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
        onLogin={() => {}} 
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        <PreviewToolbar 
          device={device} 
          setDevice={setDevice} 
          onSave={handleSave}
          onDeploy={handleDeploy}
          onPreview={handlePreview}
          publicUrl={currentLiveUrl}
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