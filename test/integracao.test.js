import app from "../src/app.js";
import request from "supertest";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearDatabase } from "./utils/clearDatabase.js";

// -----------------------------------------------------------------
// Mock do axios (ViaCEP)
// -----------------------------------------------------------------
vi.mock("axios", () => ({
    default: {
        get: vi.fn(),
    },
}));

const mockCep = () => {
    axios.get.mockResolvedValue({
        data: {
            cep: "13174410",
            logradouro: "Rua das Flores",
            bairro: "Centro",
            localidade: "Sumaré",
            uf: "SP",
        },
    });
};

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------
const criarMontadora = async (nome = "Toyota", pais = "Japão") => {
    const res = await request(app).post("/montadoras").send({ nome, pais });
    return res.body.data.insertId;
};

const criarCliente = async (overrides = {}) => {
    const payload = {
        nome: "Jorgim",
        cpf: "41345167812",
        cep: "13174410",
        numero: "105",
        complemento: "Muro Verde",
        ...overrides,
    };
    const res = await request(app).post("/clientes").send(payload);
    return res.body.data.insertId;
};

// =================================================================
// API DE MONTADORAS
// =================================================================
describe("API de montadoras", () => {
    beforeEach(async () => {
        await clearDatabase();
    });

    afterEach(async () => {
        await clearDatabase();
        vi.resetAllMocks();
    });

    it("deve listar montadoras", async () => {
        await request(app).post("/montadoras").send({ nome: "Toyota", pais: "Japão" });

        const response = await request(app).get("/montadoras");

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.some((m) => m.nome === "Toyota")).toBe(true);
    });

    it("deve criar uma montadora com sucesso", async () => {
        const response = await request(app)
            .post("/montadoras")
            .send({ nome: "Hyundai", pais: "Coreia do Sul" });

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty("insertId");
    });

    it("deve atualizar uma montadora com sucesso", async () => {
        const id = await criarMontadora();

        const response = await request(app)
            .put(`/montadoras?id=${id}`)
            .send({ nome: "Honda", pais: "Japão" });

        expect(response.status).toBe(200);
        expect(response.body.data.affectedRows).toBe(1);

        const list = await request(app).get("/montadoras");
        expect(list.body.data.some((m) => m.nome === "Honda")).toBe(true);
    });

    it("deve deletar uma montadora com sucesso", async () => {
        const id = await criarMontadora();

        const response = await request(app).delete(`/montadoras/${id}`);

        expect(response.status).toBe(200);
        expect(response.body.data.affectedRows).toBe(1);

        const list = await request(app).get("/montadoras");
        expect(list.body.data.some((m) => m.id === id)).toBe(false);
    });
});

// =================================================================
// API DE CLIENTES
// =================================================================
describe("API de clientes", () => {
    beforeEach(async () => {
        await clearDatabase();
        mockCep();
    });

    afterEach(async () => {
        await clearDatabase();
        vi.resetAllMocks();
    });

    it("deve listar clientes", async () => {
        await criarCliente();

        const response = await request(app).get("/clientes");

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.some((c) => c.nome === "Jorgim")).toBe(true);
    });

    it("deve criar um cliente com sucesso usando mock do axios", async () => {
        const response = await request(app)
            .post("/clientes")
            .send({
                nome: "Jorgim",
                cpf: "41345167812",
                cep: "13174410",
                numero: "105",
                complemento: "Muro Verde",
            });

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty("insertId");
        expect(axios.get).toHaveBeenCalledWith("https://viacep.com.br/ws/13174410/json/");
    });

    it("deve atualizar um cliente com sucesso", async () => {
        const id = await criarCliente();

        const response = await request(app)
            .put(`/clientes?id=${id}`)
            .send({
                nome: "Marcos",
                cpf: "98765432100",
                cep: "13174410",
                numero: "205",
                complemento: "Casa nova",
            });

        expect(response.status).toBe(200);
        expect(response.body.data.affectedRows).toBe(1);

        const list = await request(app).get("/clientes");
        expect(list.body.data.some((c) => c.nome === "Marcos")).toBe(true);
    });

    it("deve deletar um cliente com sucesso", async () => {
        const id = await criarCliente();

        const response = await request(app).delete(`/clientes/${id}`);

        expect(response.status).toBe(200);
        expect(response.body.data.affectedRows).toBe(1);

        const list = await request(app).get("/clientes");
        expect(list.body.data.some((c) => c.id === id)).toBe(false);
    });
});

// =================================================================
// API DE VEÍCULOS
// =================================================================
describe("API de veículos", () => {
    const criarRelacionamento = async () => {
        const idMontadora = await criarMontadora();
        const idCliente = await criarCliente();
        return { idMontadora, idCliente };
    };

    beforeEach(async () => {
        await clearDatabase();
        mockCep();
    });

    afterEach(async () => {
        await clearDatabase();
        vi.resetAllMocks();
    });

    it("deve listar veículos", async () => {
        const { idMontadora, idCliente } = await criarRelacionamento();

        await request(app)
            .post("/veiculos")
            .send({
                modelo: "Corolla",
                placa: "ABC1234",
                ano: 2020,
                cor: "Prata",
                valor: 50000,
                idCliente,
                idMontadora,
            });

        const response = await request(app).get("/veiculos");

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.some((v) => v.modelo === "Corolla")).toBe(true);
    });

    it("deve criar um veículo com sucesso", async () => {
        const { idMontadora, idCliente } = await criarRelacionamento();

        const response = await request(app)
            .post("/veiculos")
            .send({
                modelo: "Hyundai",
                placa: "ABC1234",
                ano: 2020,
                cor: "Prata",
                valor: 50000,
                idCliente,
                idMontadora,
            });

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty("insertId");
    });

    it("deve atualizar um veículo com sucesso", async () => {
        const { idMontadora, idCliente } = await criarRelacionamento();

        const created = await request(app)
            .post("/veiculos")
            .send({
                modelo: "Corolla",
                placa: "ABC1234",
                ano: 2020,
                cor: "Prata",
                valor: 50000,
                idCliente,
                idMontadora,
            });

        const response = await request(app)
            .put(`/veiculos?id=${created.body.data.insertId}`)
            .send({
                modelo: "Civic",
                placa: "XYZ9876",
                ano: 2021,
                cor: "Preto",
                valor: 65000,
                idCliente,
                idMontadora,
            });

        expect(response.status).toBe(200);
        expect(response.body.data.affectedRows).toBe(1);

        const list = await request(app).get("/veiculos");
        expect(list.body.data.some((v) => v.modelo === "Civic")).toBe(true);
    });

    it("deve deletar um veículo com sucesso", async () => {
        const { idMontadora, idCliente } = await criarRelacionamento();

        const created = await request(app)
            .post("/veiculos")
            .send({
                modelo: "Corolla",
                placa: "ABC1234",
                ano: 2020,
                cor: "Prata",
                valor: 50000,
                idCliente,
                idMontadora,
            });

        const response = await request(app).delete(
            `/veiculos/${created.body.data.insertId}`
        );

        expect(response.status).toBe(200);
        expect(response.body.data.affectedRows).toBe(1);

        const list = await request(app).get("/veiculos");
        expect(
            list.body.data.some((v) => v.id === created.body.data.insertId)
        ).toBe(false);
    });
});