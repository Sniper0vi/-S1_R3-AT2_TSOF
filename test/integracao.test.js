import app from "../src/app.js";
import request from "supertest";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearDatabase } from "./utils/clearDatabase.js";

// -----------------------------------------------------------------
// Mock do axios (ViaCEP) - dados do CEP 01310-100 (Av. Paulista)
// -----------------------------------------------------------------
vi.mock("axios", () => ({
    default: {
        get: vi.fn(),
    },
}));

const mockCep = () => {
    axios.get.mockResolvedValue({
        data: {
            cep: "01310100",
            logradouro: "Avenida Paulista",
            bairro: "Bela Vista",
            localidade: "São Paulo",
            uf: "SP",
        },
    });
};

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------
const criarMontadora = async (nome = "Volkswagen", pais = "Alemanha") => {
    const res = await request(app).post("/montadoras").send({ nome, pais });
    return res.body.data.insertId;
};

const criarCliente = async (overrides = {}) => {
    const payload = {
        nome: "Carlos Mendes",
        cpf: "52998224725",
        cep: "01310100",
        numero: "1578",
        complemento: "Bloco B",
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
        await request(app)
            .post("/montadoras")
            .send({ nome: "Volkswagen", pais: "Alemanha" });

        const response = await request(app).get("/montadoras");

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.some((m) => m.nome === "Volkswagen")).toBe(true);
    });

    it("deve criar uma montadora com sucesso", async () => {
        const response = await request(app)
            .post("/montadoras")
            .send({ nome: "Ferrari", pais: "Itália" });

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty("insertId");
    });

    it("deve atualizar uma montadora com sucesso", async () => {
        const id = await criarMontadora();

        const response = await request(app)
            .put(`/montadoras?id=${id}`)
            .send({ nome: "Porsche", pais: "Alemanha" });

        expect(response.status).toBe(200);
        expect(response.body.data.affectedRows).toBe(1);

        const list = await request(app).get("/montadoras");
        expect(list.body.data.some((m) => m.nome === "Porsche")).toBe(true);
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
        expect(response.body.data.some((c) => c.nome === "Carlos Mendes")).toBe(true);
    });

    it("deve criar um cliente com sucesso usando mock do axios", async () => {
        const response = await request(app)
            .post("/clientes")
            .send({
                nome: "Carlos Mendes",
                cpf: "52998224725",
                cep: "01310100",
                numero: "1578",
                complemento: "Bloco B",
            });

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty("insertId");
        expect(axios.get).toHaveBeenCalledWith(
            "https://viacep.com.br/ws/01310100/json/"
        );
    });

    it("deve atualizar um cliente com sucesso", async () => {
        const id = await criarCliente();

        const response = await request(app)
            .put(`/clientes?id=${id}`)
            .send({
                nome: "Beatriz Rocha",
                cpf: "11144477735",
                cep: "01310100",
                numero: "2200",
                complemento: "Apto 301",
            });

        expect(response.status).toBe(200);
        expect(response.body.data.affectedRows).toBe(1);

        const list = await request(app).get("/clientes");
        expect(list.body.data.some((c) => c.nome === "Beatriz Rocha")).toBe(true);
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
                modelo: "Golf GTI",
                placa: "RQP2A89",
                ano: 2023,
                cor: "Vermelho",
                valor: 185000,
                idCliente,
                idMontadora,
            });

        const response = await request(app).get("/veiculos");

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.some((v) => v.modelo === "Golf GTI")).toBe(true);
    });

    it("deve criar um veículo com sucesso", async () => {
        const { idMontadora, idCliente } = await criarRelacionamento();

        const response = await request(app)
            .post("/veiculos")
            .send({
                modelo: "Ferrari 488",
                placa: "FER1A23",
                ano: 2022,
                cor: "Amarelo",
                valor: 2500000,
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
                modelo: "Golf GTI",
                placa: "RQP2A89",
                ano: 2023,
                cor: "Vermelho",
                valor: 185000,
                idCliente,
                idMontadora,
            });

        const response = await request(app)
            .put(`/veiculos?id=${created.body.data.insertId}`)
            .send({
                modelo: "Porsche 911",
                placa: "PRS9K11",
                ano: 2024,
                cor: "Cinza",
                valor: 1200000,
                idCliente,
                idMontadora,
            });

        expect(response.status).toBe(200);
        expect(response.body.data.affectedRows).toBe(1);

        const list = await request(app).get("/veiculos");
        expect(list.body.data.some((v) => v.modelo === "Porsche 911")).toBe(true);
    });

    it("deve deletar um veículo com sucesso", async () => {
        const { idMontadora, idCliente } = await criarRelacionamento();

        const created = await request(app)
            .post("/veiculos")
            .send({
                modelo: "Golf GTI",
                placa: "RQP2A89",
                ano: 2023,
                cor: "Vermelho",
                valor: 185000,
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