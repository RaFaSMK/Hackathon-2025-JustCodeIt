const fs = require("fs");
const csv = require("csv-parser");
const { PrismaClient } = require("@prisma/client");
const path = require("path");

const prisma = new PrismaClient();
const inputCsv = path.join(__dirname, "proc.csv");

// Função para remover BOM da primeira linha
const removeBOM = (str) => str.replace(/^\uFEFF/, "");

// Função para converter datas inválidas para null
const parseDateSafe = (value) => {
  if (!value) return null;
  value = value.toString().trim();
  if (/^\+?\d{5,}/.test(value)) return null; // datas absurdas
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

async function importarCSV() {
  const resultados = [];

  return new Promise((resolve, reject) => {
    let firstLine = true;

    fs.createReadStream(inputCsv)
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        if (firstLine) {
          // remove BOM do cabeçalho
          Object.keys(row).forEach((key) => {
            const cleanKey = removeBOM(key);
            if (cleanKey !== key) {
              row[cleanKey] = row[key];
              delete row[key];
            }
          });
          firstLine = false;
        }

        resultados.push({
          codigo: row["codigo"] || null,
          terminologia_eventos: row["terminologia_eventos"] || null,
          correlacao:
            row["correlacao"] === "true"
              ? true
              : row["correlacao"] === "false"
              ? false
              : null,
          procedimento: row["procedimento"] || null,
          resolucao_normativa: row["resolucao_normativa"] || null,
          vigencia: parseDateSafe(row["vigencia"]),
          od: row["od"] || null,
          amb: row["amb"] || null,
          hco: row["hco"] || null,
          hso: row["hso"] || null,
          pac: row["pac"] || null,
          dut: row["dut"] || null,
          subgrupo: row["subgrupo"] || null,
          grupo: row["grupo"] || null,
          capitulo: row["capitulo"] || null,
          tipo_assinatura: row["tipo_assinatura"] || null,
        });
      })
      .on("end", async () => {
        try {
          if (resultados.length === 0) {
            console.log("⚠️ Nenhuma linha encontrada no CSV.");
            resolve();
            return;
          }

          await prisma.procedimento.createMany({
            data: resultados,
            skipDuplicates: true,
          });

          console.log("✅ Importação concluída!");
          resolve();
        } catch (err) {
          console.error("Erro no Prisma:", err);
          reject(err);
        } finally {
          await prisma.$disconnect();
        }
      })
      .on("error", (err) => {
        console.error("Erro ao ler o CSV:", err);
        reject(err);
      });
  });
}

importarCSV().catch((err) => {
  console.error("Erro geral:", err);
});
