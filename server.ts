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

// Init Groq using the server environment variable
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/groq/enhance', async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
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
          content: "Você é um especialista em documentação industrial. O usuário enviou um texto. Reescreva isso de forma técnica, clara e profissional para um relatório, mantendo os dados principais. Retorne apenas o texto melhorado."
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
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Erro: A chave da API do GROQ (GROQ_API_KEY) não está configurada nos Settings (Segredos) desta aplicação. Por favor, adicione sua chave de API Groq.' });
    }

    const { title, type } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const prompt = `Crie um workflow de 4 a 6 etapas para a demanda (tipo: ${type}): "${title}". 
Retorne APENAS um JSON estrito no seguinte formato, sem formatação markdown extra:
{ "steps": [{"label": "Nome da Etapa", "days_to_complete": 3}] }`;

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

startServer();
