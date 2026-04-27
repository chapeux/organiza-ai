import express from 'express';
import Groq from 'groq-sdk';
import 'dotenv/config';

const app = express();
app.use(express.json());

// Lazy init helper for Groq
let groqClient: Groq | null = null;
const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

// Health check
app.get('/api/health', (req, res) => {
  console.log('Health check requested at:', new Date().toISOString());
  res.json({ 
    status: 'ok', 
    groqConfigured: !!process.env.GROQ_API_KEY,
    env: process.env.NODE_ENV
  });
});

app.post('/api/groq/enhance', async (req, res) => {
  console.log('Enhance request received:', req.body?.text?.substring(0, 20));
  try {
    const groq = getGroqClient();
    if (!groq) {
      console.error('Groq API Key missing');
      return res.status(500).json({ error: 'Erro: A chave GROQ_API_KEY não configurada.' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Texto é necessário' });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: "Você é um revisor de textos industriais. Sua única função é corrigir gramática e polir o tom para torná-lo profissional e técnico. É PROIBIDO inventar informações ou adicionar detalhes. Seja conciso e fiel ao conteúdo original. Retorne apenas o texto revisado."
        },
        {
          role: 'user',
          content: text
        }
      ],
      model: 'llama-3.3-70b-versatile',
    });

    res.json({ result: chatCompletion.choices[0]?.message?.content || '' });
  } catch (error: any) {
    console.error('Error enhancing text:', error);
    res.status(500).json({ error: `Erro na IA: ${error.message || String(error)}` });
  }
});

app.post('/api/groq/suggest-workflow', async (req, res) => {
  try {
    const groq = getGroqClient();
    if (!groq) {
      return res.status(500).json({ error: 'Erro: A chave GROQ_API_KEY não configurada.' });
    }

    const { title, type } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Título é necessário' });
    }

    const prompt = `Crie um workflow curto e objetivo (4 a 6 etapas) para a demanda industrial (tipo: ${type}): "${title}". Use rótulos técnicos sucintos (máximo 4 palavras por etapa). Retorne APENAS JSON: { "steps": [{"label": "Nome Curto", "days_to_complete": 3}] }`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an AI that outputs pure JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const jsonText = chatCompletion.choices[0]?.message?.content || '{"steps": []}';
    res.json(JSON.parse(jsonText));
  } catch (error: any) {
    console.error('Error workflow:', error);
    res.status(500).json({ error: `Erro no Workflow: ${error.message || String(error)}` });
  }
});

// Export the app for Vercel
export default app;
