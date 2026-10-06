import { connection } from "../src/configs/Database.js";
import { ClienteFactory } from "./factories/ClienteFactory.js";
import { MontadoraFactory } from "./factories/MontadoraFactory.js";
import { VeiculoFactory } from "./factories/VeiculoFactory.js";

import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import assert from "node:assert";

describe("Testes de Integração - Factories", () => {

    beforeAll(async () => {
        // Garante conexão ativa antes dos testes
        await connection.query("SELECT 1");
    });

    beforeEach(async () => {
        // Limpa as tabelas na ordem correta (filhos primeiro)
        await connection.execute("DELETE FROM veiculos");
        await connection.execute("DELETE FROM clientes");
        await connection.execute("DELETE FROM montadoras");

        // Reinicia AUTO_INCREMENT
        await connection.execute("ALTER TABLE veiculos AUTO_INCREMENT = 1");
        await connection.execute("ALTER TABLE clientes AUTO_INCREMENT = 1");
        await connection.execute("ALTER TABLE montadoras AUTO_INCREMENT = 1");
    });

    afterAll(async () => {
        await connection.end();
    });

    // ---------------------------------------------------------------
    // ClienteFactory
    // ---------------------------------------------------------------
    describe("ClienteFactory.create", () => {

        it("deve criar um cliente com todos os dados", async () => {
            const cliente = await ClienteFactory.create(
                "João Silva",
                "12345678900",
                "58000-000",
                "Rua das Flores",
                "Centro",
                "João Pessoa",
                "PB",
                "100",
                "Apto 12"
            );

            assert.ok(cliente.id, "ID deve ser retornado");
            assert.strictEqual(cliente.nome, "João Silva");
            assert.strictEqual(cliente.CPF, "12345678900");
            assert.strictEqual(cliente.CEP, "58000000");
            assert.strictEqual(cliente.logradouro, "Rua das Flores");
            assert.strictEqual(cliente.bairro, "Centro");
            assert.strictEqual(cliente.cidade, "João Pessoa");
            assert.strictEqual(cliente.UF, "PB");
            assert.strictEqual(cliente.numero, "100");
            assert.strictEqual(cliente.complemento, "Apto 12");

            // Confirma persistência no banco
            const [rows] = await connection.execute(
                "SELECT * FROM clientes WHERE id = ?",
                [cliente.id]
            );
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].Nome, "João Silva");
        });

        it("deve criar um cliente sem complemento", async () => {
            const cliente = await ClienteFactory.create(
                "Ana Costa",
                "11122233344",
                "58000-002",
                "Rua B",
                "Bairro X",
                "Natal",
                "RN",
                "45",
                null
            );

            assert.ok(cliente.id);
            assert.strictEqual(cliente.complemento, null);

            const [rows] = await connection.execute(
                "SELECT * FROM clientes WHERE id = ?",
                [cliente.id]
            );
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].Nome, "Ana Costa");
        });
    });

    // ---------------------------------------------------------------
    // MontadoraFactory
    // ---------------------------------------------------------------
    describe("MontadoraFactory.create", () => {

        it("deve criar uma montadora com nome e país", async () => {
            const montadora = await MontadoraFactory.create("Toyota", "Japão");

            assert.ok(montadora.id, "ID deve ser retornado");
            assert.strictEqual(montadora.nome, "Toyota");
            assert.strictEqual(montadora.pais, "Japão");

            const [rows] = await connection.execute(
                "SELECT * FROM montadoras WHERE id = ?",
                [montadora.id]
            );
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].Nome, "Toyota");
            assert.strictEqual(rows[0].Pais, "Japão");
        });

        it("deve criar múltiplas montadoras com IDs distintos", async () => {
            const m1 = await MontadoraFactory.create("Volkswagen", "Alemanha");
            const m2 = await MontadoraFactory.create("Fiat", "Itália");

            assert.notStrictEqual(m1.id, m2.id);
            assert.strictEqual(m1.nome, "Volkswagen");
            assert.strictEqual(m2.nome, "Fiat");
        });
    });

    // ---------------------------------------------------------------
    // VeiculoFactory
    // ---------------------------------------------------------------
    describe("VeiculoFactory.create", () => {

        it("deve criar um veículo vinculado a cliente e montadora", async () => {
            const cliente = await ClienteFactory.create(
                "Maria Souza",
                "98765432100",
                "58000-001",
                "Av. Principal",
                "Bairro Novo",
                "Recife",
                "PE",
                "250",
                null
            );

            const montadora = await MontadoraFactory.create("Honda", "Japão");

            const veiculo = await VeiculoFactory.create(
                "Civic",
                "ABC-1234",
                2022,
                "Preto",
                120000.0,
                cliente.id,
                montadora.id
            );

            assert.ok(veiculo.id);
            assert.strictEqual(veiculo.modelo, "Civic");
            assert.strictEqual(veiculo.placa, "ABC-1234");
            assert.strictEqual(veiculo.ano, 2022);
            assert.strictEqual(veiculo.cor, "Preto");
            assert.strictEqual(Number(veiculo.valor), 120000);
            assert.strictEqual(veiculo.idCliente, cliente.id);
            assert.strictEqual(veiculo.idMontadora, montadora.id);

            const [rows] = await connection.execute(
                "SELECT * FROM veiculos WHERE id = ?",
                [veiculo.id]
            );
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].Placa, "ABC-1234");
        });
    });
});