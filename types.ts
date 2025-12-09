export interface LandingPageData {
  pageName: string;
  type: string;
  description: string;
  targetAudience: string;
  benefits: string[];
  heroLayout: 'centered' | 'split' | 'minimal';
  colorTheme: 'modern' | 'bold' | 'elegant' | 'playful';
}

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export interface HistoryItem {
  id: string;
  timestamp: number;
  data: LandingPageData;
  html: string;
}

export interface GeneratedContent {
  html: string;
}

export const INITIAL_FORM_STATE: LandingPageData = {
  pageName: 'My Awesome Product',
  type: 'SaaS Product Launch',
  description: 'An AI-powered tool that automates social media scheduling for busy marketers.',
  targetAudience: 'Freelancers and small business owners',
  benefits: ['Save 10 hours a week', 'Increase engagement by 40%', 'Automated analytics reports'],
  heroLayout: 'centered',
  colorTheme: 'modern'
};