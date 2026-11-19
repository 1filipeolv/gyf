import * as ImageManipulator from 'expo-image-manipulator';
import { DashData } from '../hooks/useDashboard';
import { buildInput, pickPhotos } from './analysisInput';
import { photoExists, photoUri } from './photos';
import { MUSCLE_LIST } from '../constants/muscles';
import { Analysis, NewDoc } from '../types';
import { formatDateBR } from '../utils/date';

const KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_AI_MODEL ?? 'claude-sonnet-5-5';

const SYSTEM = `Você é um especialista em ciência do exercício e nutrição esportiva. Analise os dados de um usuário e responda em português do Brasil, chamando a ferramenta submit_analysis.

Regras:
- Baseie cada ponto em princípios com respaldo científico: sobrecarga progressiva, volume semanal por grupo (referência de 10 a 20 séries/semana para hipertrofia), frequência de 2x/semana por grupo, proximidade da falha, recuperação, déficit ou superávit calórico moderado, ingestão proteica de 1,6 a 2,2 g/kg, ritmo de variação de peso (ganho magro ~0,25 a 0,5%/semana; perda de gordura ~0,5 a 1%/semana).
- No campo evidence, cite o princípio e, só se tiver certeza, o autor e ano de meta-análises ou posicionamentos conhecidos. Nunca invente estudos, números ou autores. Se não houver certeza, cite apenas o princípio.
- Use somente os dados fornecidos. Se faltar dado, diga que a conclusão é limitada e recomende registrar mais.
- Fotos: descreva apenas o que é visível (proporções, simetria, postura, definição aparente). Não estime percentual de gordura nem faça diagnóstico. Considere que luz, pose e câmera afetam a comparação.
- Seja específico e acionável. Ordene recomendações por prioridade. Pontos fortes e fracos devem citar números dos dados.
- Não prescreva dieta detalhada, suplementos ou medicamentos. Se houver sinais de comportamento alimentar de risco, ou perda de peso muito rápida, recomende acompanhamento profissional.
- Atividades cardio, passos e sono: use apenas o que estiver presente nos dados; se vier "sem registros", não conclua nada sobre esse item. As kcal de atividades são estimativas por MET (salvo origem manual) e os passos podem se sobrepor às atividades: não some os dois sem avisar e não trate como medição exata.\n- Alimentação e água (alimentacaoEAgua): kcal e macros são digitados pelo usuário a partir de outra IA, logo são estimativas; use só como tendência, não some com o gasto de atividades como se fosse exato, e se vier \"sem registros\" não conclua nada. Dias sem registro não significam jejum.\n- Calorias só se houver dados suficientes (peso, altura, sexo, idade); caso contrário omita calorieTargetKcal e explique.`;

const finding = {
  type: 'object',
  properties: { title: { type: 'string' }, detail: { type: 'string' }, evidence: { type: 'string' } },
  required: ['title', 'detail', 'evidence'],
};

const TOOL = {
  name: 'submit_analysis',
  description: 'Entrega a análise estruturada.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      strengths: { type: 'array', items: finding },
      weaknesses: { type: 'array', items: finding },
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            detail: { type: 'string' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            category: { type: 'string', enum: ['training', 'nutrition', 'recovery', 'tracking'] },
            evidence: { type: 'string' },
          },
          required: ['title', 'detail', 'priority', 'category', 'evidence'],
        },
      },
      trainingAdjustments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            muscle: { type: 'string', enum: MUSCLE_LIST },
            action: {
              type: 'string',
              enum: ['increase_volume', 'decrease_volume', 'maintain', 'change_frequency', 'change_duration', 'deload'],
            },
            detail: { type: 'string' },
            evidence: { type: 'string' },
          },
          required: ['action', 'detail', 'evidence'],
        },
      },
      nutrition: {
        type: 'object',
        properties: {
          calorieTargetKcal: { type: 'number' },
          proteinGPerKg: { type: 'number' },
          proteinTotalG: { type: 'number' },
          fatGPerKg: { type: 'number' },
          carbsNote: { type: 'string' },
          strategy: { type: 'string', enum: ['surplus', 'deficit', 'maintenance'] },
          rationale: { type: 'string' },
        },
        required: ['strategy', 'rationale'],
      },
      disclaimer: { type: 'string' },
    },
    required: ['summary', 'strengths', 'weaknesses', 'recommendations', 'trainingAdjustments', 'nutrition', 'disclaimer'],
  },
};

type Block =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } };

export async function runAnalysis(d: DashData): Promise<NewDoc<Analysis>> {
  if (!KEY) throw new Error('Chave da API ausente no .env.');

  const picked = pickPhotos(d.photos);
  const blocks: Block[] = [];
  const used: string[] = [];
  const labels = { front: 'frente', side: 'lado', back: 'costas' };

  for (const p of picked) {
    if (!(await photoExists(p))) continue;
    const out = await ImageManipulator.manipulateAsync(photoUri(p), [{ resize: { width: 768 } }], {
      compress: 0.6,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (!out.base64) continue;
    used.push(p.id);
    blocks.push({
      type: 'text',
      text: `Foto de ${labels[p.angle]} em ${formatDateBR(p.date)}${p.weightKg ? `, ${p.weightKg} kg` : ''}:`,
    });
    blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: out.base64 } });
  }

  const { payload, summary } = buildInput(d, used);
  blocks.push({
    type: 'text',
    text: `Dados do usuário (JSON):\n${JSON.stringify(payload)}\n\nFotos analisadas: ${used.length}. Gere a análise.`,
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'submit_analysis' },
      messages: [{ role: 'user', content: blocks }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const tool = (json.content as { type: string; input?: any }[]).find((c) => c.type === 'tool_use');
  if (!tool?.input) throw new Error('Resposta da IA sem análise.');
  const o = tool.input;

  return {
    model: MODEL,
    goal: d.profile?.goal ?? 'hypertrophy',
    input: summary,
    summary: o.summary ?? '',
    strengths: o.strengths ?? [],
    weaknesses: o.weaknesses ?? [],
    recommendations: o.recommendations ?? [],
    trainingAdjustments: o.trainingAdjustments ?? [],
    nutrition: o.nutrition ?? { strategy: 'maintenance', rationale: '' },
    disclaimer: o.disclaimer ?? '',
  };
}