import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

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

app.post('/api/groq/enhance', async (req, res) => {
  try {
    const groq = getGroqClient();
    if (!groq) {
      return res.status(500).json({ error: 'Erro: A chave da API do GROQ (GROQ_API_KEY) não está configurada nos Settings (Segredos) desta aplicação. Por favor, adicione sua chave de API Groq.' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: "Você é um revisor de textos industriais. Sua única função é corrigir gramática e polir o tom para torná-lo profissional e técnico. É PROIBIDO inventar informações, adicionar detalhes não informados pelo usuário ou criar textos longos. Seja extremamente conciso e fiel ao conteúdo original. Se o texto original for curto, a resposta deve ser curta. Retorne apenas o texto revisado."
        },
        {
          role: 'user',
          content: text
        }
      ],
      model: 'llama-3.3-70b-versatile',
    });

    res.json({ result: chatCompletion.choices[0]?.message?.content || '' });
  } catch (error) {
    console.error('Error enhancing text:', error);
    res.status(500).json({ error: `Failed to enhance text: ${error instanceof Error ? error.message : String(error)}` });
  }
});

app.post('/api/groq/suggest-workflow', async (req, res) => {
  try {
    const groq = getGroqClient();
    if (!groq) {
      return res.status(500).json({ error: 'Erro: A chave da API do GROQ (GROQ_API_KEY) não está configurada nos Settings (Segredos) desta aplicação. Por favor, adicione sua chave de API Groq.' });
    }

    const { title, type } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const prompt = `Crie um workflow curto e objetivo (4 a 6 etapas) para a demanda industrial (tipo: ${type}): "${title}". 
Use rótulos técnicos sucintos (máximo 4 palavras por etapa).
Retorne APENAS um JSON estrito no seguinte formato:
{ "steps": [{"label": "Nome Curto", "days_to_complete": 3}] }`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an AI that outputs pure JSON based exactly on the requested schema.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const jsonText = chatCompletion.choices[0]?.message?.content || '{"steps": []}';
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      data = { steps: [] };
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error suggesting workflow:', error);
    res.status(500).json({ error: `Failed to suggest workflow: ${error instanceof Error ? error.message : String(error)}` });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export for serverless environments like Vercel
export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}
