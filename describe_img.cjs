const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const imgPath = process.argv[2] || 'public/apgreyd.jpg';
  const data = fs.readFileSync(imgPath);
  const mimeType = imgPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Analyze this UI screenshot in extreme detail. It is a mock-up for a React component. Detail the background, layout, elements, cards, colors, wheel (if any), text, inputs, buttons. Include all visual hierarchy and exact positioning.' },
          { inlineData: { data: data.toString('base64'), mimeType: mimeType } }
        ]
      }
    ]
  });
  console.log(`--- Description of ${imgPath} ---`);
  console.log(response.text);
}
run().catch(console.error);
