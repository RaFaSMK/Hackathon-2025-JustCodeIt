const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const prisma = new PrismaClient();
const execPromise = util.promisify(exec);

// --- FUNÇÕES AUXILIARES ---
async function cleanupFiles(files) {
  for (const file of files) {
    if (file) {
      try { await fs.unlink(file); } catch (err) { /* ignorar erros */ }
    }
  }
}

function parseExamsFromText(rawText) {
  const regex = /Exames\s+Laboratoriais\s*([\s\S]*)(?=\n\n\S)/;
  const match = rawText.match(regex);
  if (match && match[1]) {
    return match[1].split('\n')
      .map(line => line.trim().replace(/\)$/, ''))
      .filter(line => line.length > 5);
  }
  return [];
}

// --- FUNÇÕES PRINCIPAIS ---
async function getDeadlinesAndTipoAssinatura(examNames) {
  if (!examNames || examNames.length === 0) return { exams: [], statusProtocolo: false };

  const exams = await Promise.all(
    examNames.map(async (examName) => {
      const coreExamName = examName.split(' - ')[0].trim();
      try {
        const record = await prisma.procedimento.findFirst({
          where: { terminologia_eventos: { contains: coreExamName, mode: 'insensitive' } },
        });

        let prazo = 'Não encontrado no banco';
        let tipo_assinatura = 'Não encontrado';
        let status = false;

        if (record) {
          tipo_assinatura = record.tipo_assinatura;
          switch (record.tipo_assinatura) {
            case 'S/A': prazo = '0 Dias'; status = true; break;
            case 'A': prazo = '5 Dias'; break;
            case 'OPME': prazo = '10 Dias'; break;
            default: prazo = 'Prazo não definido'; break;
          }
        }

        return { exame: examName, tipo_assinatura, prazo, status };
      } catch (error) {
        console.error(`Erro ao buscar o exame "${examName}":`, error);
        return { exame: examName, tipo_assinatura: 'Erro', prazo: 'Erro na consulta', status: false };
      }
    })
  );

  const statusProtocolo = exams.some(e => e.status); // global
  return { exams, statusProtocolo };
}

async function extractTextFromImage(imagePath) {
  try {
    const { stdout: fullText } = await execPromise(`tesseract "${imagePath}" stdout -l por --oem 1 --psm 3`);
    return parseExamsFromText(fullText);
  } catch (error) {
    throw new Error('Falha ao ler o conteúdo da imagem.');
  }
}

async function getContextFromFile(file) {
  let originalFilePath = file.path;
  let imagePathForOcr = originalFilePath;
  let createdImagePath = null;

  if (file.mimetype === 'application/pdf') {
    const outputPrefix = `converted-${path.parse(originalFilePath).name}`;
    const outputPath = path.join(path.dirname(originalFilePath), outputPrefix);
    await execPromise(`pdftoppm -png -r 300 -f 1 -l 1 "${originalFilePath}" "${outputPath}"`);
    createdImagePath = `${outputPath}-1.png`;
    imagePathForOcr = createdImagePath;
  }

  try {
    const parsedExams = await extractTextFromImage(imagePathForOcr);
    return await getDeadlinesAndTipoAssinatura(parsedExams);
  } finally {
    await cleanupFiles([originalFilePath, createdImagePath]);
  }
}

async function extractExamsFromFile(file) {
  return await getContextFromFile(file);
}

// --- FUNÇÃO FINAL: PROCESSAR ARQUIVO E SALVAR CONSULTA ---
async function processFileAndSaveConsulta(file) {
  const protocolo = `UNIAGENDE-${dayjs().format("YYYYMMDD")}-${uuidv4().slice(0, 8)}`;

  const { exams: dadosExtraidos, statusProtocolo } = await extractExamsFromFile(file);

  const consultaSalva = await prisma.consulta.create({
    data: {
      cidade: 'N/A',
      especialidade: 'N/A',
      medico: 'N/A',
      dataHora: new Date(),
      protocolo
    }
  });

  return { protocolo, dadosExtraidos, statusProtocolo, consultaSalva };
}

module.exports = { extractExamsFromFile, processFileAndSaveConsulta };
