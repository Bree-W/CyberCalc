import {
  ANALYST_SYSTEM_PROMPT,
  parseAnalystResponse,
  sanitizeAnalystSummary,
} from '@/lib/analyst';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const apiKey = process.env.DO_INFERENCE_API_KEY;
  const model = process.env.DO_INFERENCE_MODEL || 'openai-gpt-oss-20b';
  if (!apiKey || apiKey === 'replace-with-model-access-key') {
    return Response.json({ error: 'The model access key is not configured on the server.' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'The request body was not JSON.' }, { status: 400 });
  }

  const summary = sanitizeAnalystSummary(body);
  if (!summary || summary.byteCount === 0) {
    return Response.json({ error: 'Load some bytes before asking the model.' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch('https://inference.do-ai.run/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          { role: 'system', content: ANALYST_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(summary) },
        ],
      }),
    });
  } catch {
    return Response.json({ error: 'DigitalOcean inference could not be reached.' }, { status: 502 });
  }

  if (!upstream.ok) {
    const statusHint =
      upstream.status === 401
        ? 'The model access key was rejected.'
        : upstream.status === 402 || upstream.status === 403
          ? 'Inference refused the request. Check the team balance and the model scope on the key.'
          : upstream.status === 404
            ? `DigitalOcean does not serve the model id "${model}".`
            : `Inference returned status ${upstream.status}.`;
    return Response.json({ error: statusHint }, { status: 502 });
  }

  let payload: { choices?: Array<{ message?: { content?: unknown } }> };
  try {
    payload = await upstream.json();
  } catch {
    return Response.json({ error: 'Inference returned a response that was not JSON.' }, { status: 502 });
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    return Response.json({ error: 'Inference returned no text.' }, { status: 502 });
  }

  try {
    const plan = parseAnalystResponse(content);
    return Response.json({ ...plan, model });
  } catch {
    return Response.json({ error: 'The model reply was not a usable lab choice.' }, { status: 502 });
  }
}
