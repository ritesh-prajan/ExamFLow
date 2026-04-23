import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker source for pdfjs-dist using Vite's ?url suffix
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Sort items by their vertical position (top to bottom)
    // then by their horizontal position (left to right)
    const items = textContent.items as any[];
    
    let lastY = -1;
    let pageText = '';
    
    for (const item of items) {
      const currentY = item.transform[5];
      
      if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
        pageText += '\n';
      } else if (lastY !== -1) {
        pageText += ' ';
      }
      
      pageText += item.str;
      lastY = currentY;
    }
    
    fullText += pageText + '\n\n';
  }
  
  return fullText;
}
