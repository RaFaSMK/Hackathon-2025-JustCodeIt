require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { InferenceClient } = require("@huggingface/inference");

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const client = new InferenceClient(HF_API_KEY);

// Caminho para o arquivo de contexto
const contextPath = path.join(__dirname, "..", "contexto.txt");

// Lista de termos proibidos (conhecimento geral) - permanece igual
const termosProibidos = [
  "capital do brasil", "capital de brasília", "presidente", "história do brasil",
  "quantos estados", "bandeira", "governo", "país", "brasil", "nacional",
  "internacional", "geografia", "história", "planeta", "continente"
];

function contemConhecimentoGeral(pergunta) {
  const perguntaLower = pergunta.toLowerCase();
  return termosProibidos.some(termo => perguntaLower.includes(termo));
}

function respostaÉVálida(respostaGerada, contextoInstitucional) { // Passa o contexto como argumento
  const fraseSegura = "Desculpe, eu só posso responder perguntas com base nas informações internas da universidade.";

  const palavrasContexto = contextoInstitucional.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/);
  const palavrasResposta = respostaGerada.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/);
  const intersecao = palavrasResposta.filter(p => palavrasContexto.includes(p));
  const respostaContemContexto = intersecao.length > 3;

  return respostaContemContexto || respostaGerada.includes(fraseSegura);
}

async function askHuggingFace(pergunta) {
  try {
    // ---- MODIFICAÇÃO PRINCIPAL: LEIA O ARQUIVO AQUI ----
    const contextoInstitucional = fs.readFileSync(contextPath, "utf-8").trim();

    // Monta o prompt do sistema com o contexto atualizado
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
    // ----------------------------------------------------

    if (contemConhecimentoGeral(pergunta)) {
      return "Desculpe, eu só posso responder perguntas com base nas informações internas da universidade.";
    }

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

    // Passa o contexto lido para a função de validação
    if (!respostaÉVálida(respostaGerada, contextoInstitucional)) {
      return "Desculpe, eu só posso responder perguntas com base nas informações internas da universidade.";
    }

    return respostaGerada;

  } catch (error) {
    console.error("Erro Hugging Face:", error);
    return "Erro ao obter resposta da IA.";
  }
}

module.exports = { askHuggingFace };