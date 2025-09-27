require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { InferenceClient } = require("@huggingface/inference");

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const client = new InferenceClient(HF_API_KEY);

// Carrega o contexto institucional
const contextPath = path.join(__dirname, "..", "contexto.txt");
const contextoInstitucional = fs.readFileSync(contextPath, "utf-8").trim();

const systemPrompt = `
Você é um assistente universitário útil. Sua ÚNICA fonte de informação é o CONTEXTO INSTITUCIONAL abaixo e poderá usar a internet somente para procurar substantivos para palavras chaves.

REGRAS:
1. NÃO responda perguntas de conhecimento geral (ex: "capital do Brasil", "presidente", "história mundial", etc).
2. SÓ use informações do CONTEXTO.
3. Se a resposta não estiver no CONTEXTO, você deve dizer exatamente:
"Desculpe, eu só posso responder perguntas com base nas informações internas da universidade."
4. Não utilize '*' e '#'.

CONTEXTO INSTITUCIONAL:
---
${contextoInstitucional}
---
`.trim();

// Lista de termos proibidos (conhecimento geral)
const termosProibidos = [
  "capital do brasil",
  "capital de brasília",
  "presidente",
  "história do brasil",
  "quantos estados",
  "bandeira",
  "governo",
  "país",
  "brasil",
  "nacional",
  "internacional",
  "geografia",
  "história",
  "planeta",
  "continente"
];

// Função para verificar se a pergunta contém temas proibidos
function contemConhecimentoGeral(pergunta) {
  const perguntaLower = pergunta.toLowerCase();
  return termosProibidos.some(termo => perguntaLower.includes(termo));
}

// Verifica se a resposta é baseada no contexto
function respostaÉVálida(respostaGerada) {
  const fraseSegura = "Desculpe, eu só posso responder perguntas com base nas informações internas da universidade.";

  const palavrasContexto = contextoInstitucional
    .toLowerCase()
    .replace(/[.,!?;:]/g, '')
    .split(/\s+/);

  const palavrasResposta = respostaGerada
    .toLowerCase()
    .replace(/[.,!?;:]/g, '')
    .split(/\s+/);

  const intersecao = palavrasResposta.filter(p => palavrasContexto.includes(p));
  const respostaContemContexto = intersecao.length > 3;

  return respostaContemContexto || respostaGerada.includes(fraseSegura);
}

// Função principal
async function askHuggingFace(pergunta) {
  try {
    // Verifica se é uma pergunta proibida
    if (contemConhecimentoGeral(pergunta)) {
      return "Desculpe, eu só posso responder perguntas com base nas informações internas da universidade.";
    }

    // Chama o modelo
    const respostaIA = await client.chatCompletion({
      provider: "fireworks-ai",
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: pergunta },
      ],
      temperature: 0.0,
    });

    const respostaGerada = respostaIA.choices?.[0]?.message?.content?.trim() || "";

    // Verificação de segurança
    if (!respostaÉVálida(respostaGerada)) {
      return "Desculpe, eu só posso responder perguntas com base nas informações internas da universidade.";
    }

    return respostaGerada;

  } catch (error) {
    console.error("Erro Hugging Face:", error);
    return "Erro ao obter resposta da IA.";
  }
}

module.exports = { askHuggingFace };
