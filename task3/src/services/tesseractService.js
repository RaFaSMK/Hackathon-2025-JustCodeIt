const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

// Cria uma versão "Promise" do 'exec' para usá-lo com async/await
const execPromise = util.promisify(exec);

/**
 * Limpa (deleta) uma lista de arquivos temporários de forma segura.
 * @param {string[]} files Array com os caminhos dos arquivos a serem deletados.
 */
async function cleanupFiles(files) {
    for (const file of files) {
        if (file) {
            try {
                await fs.unlink(file);
                console.log(`[CLEANUP] Arquivo temporário ${file} removido.`);
            } catch (err) {
                // Ignora erros caso o arquivo não exista, evitando que a aplicação quebre.
            }
        }
    }
}

/*
 * Extrai a lista de exames de um texto bruto de OCR.
 * @param {string} rawText O texto completo extraído pelo Tesseract.
 * @returns {string[]} Um array contendo cada linha de exame limpa.
 */
function parseExamsFromText(rawText) {
    // --- REGEX CORRIGIDA ---
    // Esta regex agora captura tudo após "Exames Laboratoriais" até encontrar
    // um padrão que se parece com o fim da lista (duas quebras de linha seguidas por
    // pelo menos duas letras maiúsculas, como "LL" ou um nome de médico).
    // O (?=...) é um "lookahead" que olha à frente sem incluir o delimitador na captura.
    const regex = /Exames\s+Laboratoriais\s*([\s\S]*?)(?=\n\n[A-Z]{2,})/;

    const match = rawText.match(regex);

    if (match && match[1]) {
        const examBlock = match[1];

        // O processo de limpeza continua o mesmo e vai funcionar corretamente
        // com o bloco de texto completo.
        const exams = examBlock
            .split('\n')
            .map(line => line.trim().replace(/\)$/, '')) // Adicionado .replace() para remover ')' no final
            .filter(line => line.length > 5); // Aumentado o filtro para ignorar linhas muito curtas

        return exams;
    }

    return [];
}

/**
 * Executa o Tesseract em um arquivo de IMAGEM e processa o resultado.
 * @param {string} imagePath O caminho para o arquivo de imagem.
 * @returns {Promise<object>} Um objeto com o texto completo e a lista de exames extraída.
 */
async function extractTextFromImage(imagePath) {
    console.log(`[OCR LOCAL] Processando imagem: ${imagePath}`);
    try {
        const command = `tesseract "${imagePath}" stdout -l por --oem 1 --psm 3`;
        const { stdout: fullText } = await execPromise(command);

        console.log('[PARSE] Extraindo exames do texto bruto...');
        const parsedExams = parseExamsFromText(fullText);

        return {
            exams: parsedExams
        };
    } catch (error) {
        console.error('[OCR LOCAL] Erro ao extrair texto com Tesseract:', error);
        throw new Error('Falha ao ler o conteúdo da imagem localmente.');
    }
}

/**
 * Orquestrador principal: recebe um arquivo, converte se for PDF, e chama o OCR.
 * @param {object} file O objeto do arquivo vindo do multer (req.file).
 * @returns {Promise<object>} O resultado final do processamento.
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
        
        // Comando para converter a primeira página do PDF para PNG com 300 DPI
        const command = `pdftoppm -png -r 300 -f 1 -l 1 "${originalFilePath}" "${outputPath}"`;

        try {
            await execPromise(command);
            // O pdftoppm adiciona '-1' ao final do nome do arquivo para a primeira página
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
        // Envia o caminho da IMAGEM (original ou convertida) para o processamento de OCR
        return await extractTextFromImage(imagePathForOcr);
    } catch (error) {
        console.error('Erro no serviço de extração:', error);
        throw error;
    } finally {
        // Limpa todos os arquivos temporários criados no processo
        await cleanupFiles([originalFilePath, createdImagePath]);
    }
}

/**
 * Função de entrada exportada, chamada pelas rotas.
 * @param {object} file O objeto do arquivo vindo do multer (req.file).
 */
async function extractExamsFromFile(file) {
    return await getContextFromFile(file);
}

module.exports = {
    extractExamsFromFile,
};