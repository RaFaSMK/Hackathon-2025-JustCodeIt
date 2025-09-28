-- CreateTable
CREATE TABLE "public"."Procedimento" (
    "id" TEXT NOT NULL,
    "codigo" TEXT,
    "terminologia_eventos" TEXT NOT NULL,
    "correlacao" TEXT,
    "procedimento" TEXT,
    "resolucao_normativa" TEXT,
    "vigencia" TIMESTAMP(3),
    "od" TEXT,
    "amb" TEXT,
    "hco" TEXT,
    "hso" TEXT,
    "pac" TEXT,
    "dut" TEXT,
    "subgrupo" TEXT,
    "grupo" TEXT,
    "capitulo" TEXT,
    "tipo_assinatura" TEXT NOT NULL,

    CONSTRAINT "Procedimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Consulta" (
    "id" SERIAL NOT NULL,
    "cidade" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "medico" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "protocolo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ValidacaoProtocolo" (
    "protocolo" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ValidacaoProtocolo_pkey" PRIMARY KEY ("protocolo")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consulta_protocolo_key" ON "public"."Consulta"("protocolo");
