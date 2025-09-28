const express = require("express");
const { PrismaClient } = require("@prisma/client");
const dayjs = require("dayjs");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
const prisma = new PrismaClient();

// === SIMULAÇÃO DE MÉDICOS DISPONÍVEIS ===
const medicos = [
  { nome: "Dra. Mariana Silva", especialidade: "Cardiologia", cidade: "São Paulo" },
  { nome: "Dr. João Pereira", especialidade: "Pediatria", cidade: "Campinas" },
  { nome: "Dra. Ana Costa", especialidade: "Clínica Geral", cidade: "São Paulo" }
];

// 1. Especialidades por cidade
router.get("/especialidades", (req, res) => {
  const { cidade } = req.query;
  if (!cidade) return res.status(400).json({ error: "Informe a cidade" });

  const especialidades = [...new Set(
    medicos.filter(m => m.cidade.toLowerCase() === cidade.toLowerCase())
           .map(m => m.especialidade)
  )];

  if (especialidades.length === 0) return res.json({ mensagem: "Nenhuma especialidade encontrada nessa cidade." });

  res.json({ especialidades });
});

// 2. Médicos por especialidade e cidade
router.get("/medicos", (req, res) => {
  const { cidade, especialidade } = req.query;
  if (!cidade || !especialidade) return res.status(400).json({ error: "Informe cidade e especialidade" });

  const lista = medicos.filter(
    m => m.cidade.toLowerCase() === cidade.toLowerCase() &&
         m.especialidade.toLowerCase() === especialidade.toLowerCase()
  );

  if (lista.length === 0) return res.json({ mensagem: "Nenhum médico encontrado." });

  res.json({ medicos: lista.map(m => m.nome) });
});

// 3. Datas disponíveis (30 dias, úteis, 09h e 14h)
router.get("/datas", (req, res) => {
  const { medico } = req.query;
  if (!medico) return res.status(400).json({ error: "Informe o médico" });

  const hoje = dayjs().startOf("day");
  const datas = [];

  for (let i = 0; i <= 30; i++) {
    const dia = hoje.add(i, "day");
    if (dia.day() !== 0 && dia.day() !== 6) {
      datas.push({ data: dia.format("YYYY-MM-DD"), horarios: ["09:00", "14:00"] });
    }
  }

  res.json({ medico, datas });
});

// 4. Agendamento final com validação de duplicidade
router.post("/agendar", async (req, res) => {
  const { cidade, especialidade, medico, data, hora } = req.body;

  if (!cidade || !especialidade || !data || !hora) {
    return res.status(400).json({ 
      error: "Campos obrigatórios: cidade, especialidade, data, hora (+ médico opcional)" 
    });
  }

  const dataHora = dayjs(`${data} ${hora}`).toDate();

  try {
    // ✅ Verifica se já existe uma consulta no mesmo dia/hora para o mesmo médico
    const existente = await prisma.consulta.findFirst({
      where: { medico, dataHora }
    });

    if (existente) {
      return res.status(400).json({
        error: "Já existe uma consulta agendada para esse médico nesse dia e horário."
      });
    }

    // Criar consulta normalmente
    const protocolo = `UNIAGENDE-${dayjs().format("YYYYMMDD")}-${uuidv4().slice(0, 8)}`;
    const consulta = await prisma.consulta.create({
      data: { cidade, especialidade, medico, dataHora, protocolo }
    });

    res.json({ mensagem: "Consulta agendada com sucesso!", consulta });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao agendar consulta" });
  }
});

module.exports = router;
