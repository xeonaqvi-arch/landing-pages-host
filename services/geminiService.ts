import { GoogleGenAI } from "@google/genai";
import { LandingPageData } from "../types";

// Fixed: Use process.env.API_KEY exclusively for API key
const ai = new GoogleGenAI({ apiKey: "AIzaSyCabFSsGVFIPgOL02_ZVf5p_Yhd0cXzvYQ" });

export const generateLandingPage = async (data: LandingPageData): Promise<string> => {
  // Fixed: Use gemini-3-pro-preview for complex coding tasks
  const modelId = "gemini-3-pro-preview"; 

  const prompt = `
    You are an expert frontend React and Tailwind CSS developer.
    Create a single-file HTML landing page based on the following specifications:
    
    - **Product Name:** ${data.pageName}
    - **Type:** ${data.type}
    - **Description:** ${data.description}
    - **Target Audience:** ${data.targetAudience}
    - **Key Benefits:** ${data.benefits.join(', ')}
    - **Hero Layout:** ${data.heroLayout}
    - **Color Theme Style:** ${data.colorTheme}

    **Requirements:**
    1. Return ONLY the raw HTML code. Do not wrap it in markdown code blocks (e.g., \`\`\`html).
    2. Use **Tailwind CSS** via CDN for all styling. 
    3. Include a <script src="https://cdn.tailwindcss.com"></script> in the head.
    4. Make it look professional, modern, and high-converting.
    5. Ensure the design is fully responsive (mobile-first).
    6. Use standard semantic HTML5 tags.
    7. Use placeholder images from https://picsum.photos/800/600 or https://picsum.photos/400/400 where appropriate.
    8. The body should have a white or very light background.
    9. Include sections: Hero, Benefits/Features (using the provided benefits), Testimonials (make up 2 generic ones), and a Call to Action footer.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    let text = response.text || "";
    
    // Cleanup if the model wraps in markdown despite instructions
    text = text.replace(/```html/g, '').replace(/```/g, '');
    
    return text;
  } catch (error) {
    console.error("Error generating landing page:", error);
    throw error;
  }
};