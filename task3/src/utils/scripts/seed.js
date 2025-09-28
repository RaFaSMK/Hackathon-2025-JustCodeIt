const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const cidades = ['São Paulo', 'Campinas', 'Rio de Janeiro'];
  const especialidades = ['Cardiologia', 'Pediatria', 'Clínica Geral', 'Dermatologia'];

  // Médicos simulados
  const medicos = [
    { nome: 'Dra. Mariana Silva', especialidade: 'Cardiologia', cidade: 'São Paulo' },
    { nome: 'Dr. Carlos Lima', especialidade: 'Cardiologia', cidade: 'São Paulo' },
    { nome: 'Dr. João Pereira', especialidade: 'Pediatria', cidade: 'Campinas' },
    { nome: 'Dra. Ana Costa', especialidade: 'Clínica Geral', cidade: 'São Paulo' },
    { nome: 'Dra. Beatriz Rocha', especialidade: 'Dermatologia', cidade: 'Rio de Janeiro' },
    { nome: 'Dr. Felipe Santos', especialidade: 'Dermatologia', cidade: 'Rio de Janeiro' }
  ];

  const hoje = dayjs().startOf('day');
  let protocoloCounter = 1;

  for (const medico of medicos) {
    for (let i = 0; i <= 30; i++) {
      const dia = hoje.add(i, 'day');

      // Apenas dias úteis
      if (dia.day() === 0 || dia.day() === 6) continue;

      // Horários disponíveis
      const horarios = ['09:00', '14:00'];
      for (const hora of horarios) {
        await prisma.consulta.create({
          data: {
            cidade: medico.cidade,
            especialidade: medico.especialidade,
            medico: medico.nome,
            dataHora: dayjs(`${dia.format('YYYY-MM-DD')} ${hora}`).toDate(),
            protocolo: `UNIAGENDE-${dia.format('YYYYMMDD')}-${protocoloCounter.toString().padStart(4, '0')}`
          }
        });
        protocoloCounter++;
      }
    }
  }

  console.log('Seed concluído! Banco populado com consultas simuladas.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
