const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const prisma = require('../prisma'); // Importa o cliente Prisma

// Cria uma versão "Promise" do 'exec' para usá-lo com async/await
const execPromise = util.promisify(exec);

// --- FUNÇÕES AUXILIARES ---

/**
 * Limpa (deleta) uma lista de arquivos temporários de forma segura.
 */
async function cleanupFiles(files) {
    for (const file of files) {
        if (file) {
            try {
                await fs.unlink(file);
                console.log(`[CLEANUP] Arquivo temporário ${file} removido.`);
            } catch (err) {
                // Ignora erros caso o arquivo não exista
            }
        }
    }
}

/**
 * Extrai a lista de exames de um texto bruto de OCR.
 */
function parseExamsFromText(rawText) {
    const regex = /Exames\s+Laboratoriais\s*([\s\S]*)(?=\n\n\S)/;
    const match = rawText.match(regex);
    if (match && match[1]) {
        const examBlock = match[1];
        return examBlock
            .split('\n')
            .map(line => line.trim().replace(/\)$/, ''))
            .filter(line => line.length > 5);
    }
    return [];
}

// --- FUNÇÕES PRINCIPAIS DO FLUXO ---

/**
 * Etapa 3: Busca os prazos para uma lista de exames no banco de dados via Prisma.
 */
async function getDeadlinesForExams(examNames) {
    if (!examNames || examNames.length === 0) {
        return [];
    }
    const results = await Promise.all(
        examNames.map(async (examName) => {
            const coreExamName = examName.split(' - ')[0].trim();
            try {
                // Lembre-se de substituir 'procedimento' pelo nome do seu model no schema.prisma
                const record = await prisma.procedimento.findFirst({
                    where: {
                        terminologia_eventos: {
                            contains: coreExamName,
                            mode: 'insensitive',
                        },
                    },
                });

                let prazo = 'Não encontrado no banco';
                if (record) {
                    switch (record.tipo_assinatura) {
                        case 'S/A': prazo = '0 Dias'; break;
                        case 'A': prazo = '5 dias'; break;
                        case 'OPME': prazo = '10 dias'; break;
                        default: prazo = 'Prazo não definido'; break;
                    }
                }
                return { exame: examName, prazo: prazo };
            } catch (error) {
                console.error(`Erro ao buscar o exame "${examName}":`, error);
                return { exame: examName, prazo: 'Erro na consulta' };
            }
        })
    );
    return results;
}

/**
 * Etapa 2: Executa o Tesseract em um arquivo de IMAGEM e extrai os nomes dos exames.
 */
async function extractTextFromImage(imagePath) {
    console.log(`[OCR LOCAL] Processando imagem: ${imagePath}`);
    try {
        const command = `tesseract "${imagePath}" stdout -l por --oem 1 --psm 3`;
        const { stdout: fullText } = await execPromise(command);

        console.log("--- TEXTO BRUTO EXTRAÍDO PELO TESSERACT ---");
        console.log(fullText);
        console.log("-------------------------------------------");

        console.log('[PARSE] Extraindo exames do texto bruto...');
        const parsedExams = parseExamsFromText(fullText);
        return { exams: parsedExams };
    } catch (error) {
        console.error('[OCR LOCAL] Erro ao extrair texto com Tesseract:', error);
        throw new Error('Falha ao ler o conteúdo da imagem localmente.');
    }
}

/**
 * Etapa 1: Orquestrador principal. Recebe o arquivo, converte se for PDF, e gerencia o fluxo.
 */
async function getContextFromFile(file) {
    console.log('[CONTEXTO] Processando arquivo...');
    let originalFilePath = file.path;
    let imagePathForOcr = originalFilePath;
    let createdImagePath = null;

    if (file.mimetype === 'application/pdf') {
        console.log('[CONVERSÃO] PDF detectado. Convertendo para imagem...');
        const outputPrefix = `converted-${path.parse(originalFilePath).name}`;
        const outputPath = path.join(path.dirname(originalFilePath), outputPrefix);
        const command = `pdftoppm -png -r 300 -f 1 -l 1 "${originalFilePath}" "${outputPath}"`;

        try {
            await execPromise(command);
            createdImagePath = `${outputPath}-1.png`;
            imagePathForOcr = createdImagePath;
            console.log(`[CONVERSÃO] PDF convertido com sucesso para: ${imagePathForOcr}`);
        } catch (error) {
            console.error('[CONVERSÃO] Erro ao converter PDF:', error);
            await cleanupFiles([originalFilePath]);
            throw new Error('Falha ao converter o arquivo PDF.');
        }
    }

    try {
        const ocrResult = await extractTextFromImage(imagePathForOcr);

        if (ocrResult && ocrResult.exams.length > 0) {
            console.log('[DATABASE] Buscando prazos para os exames encontrados...');
            return await getDeadlinesForExams(ocrResult.exams);
        }
        
        return []; // Retorna lista vazia se nenhum exame foi encontrado no OCR
    } catch (error) {
        console.error('Erro no serviço de extração:', error);
        throw error;
    } finally {
        await cleanupFiles([originalFilePath, createdImagePath]);
    }
}

/**
 * Função de entrada que é exportada e chamada pelas rotas.
 */
async function extractExamsFromFile(file) {
    return await getContextFromFile(file);
}

module.exports = {
    extractExamsFromFile,
};