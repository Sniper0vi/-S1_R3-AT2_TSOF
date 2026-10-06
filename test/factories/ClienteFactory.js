import { connection } from "../../src/configs/Database.js";

function limparNumero(numero) {
    return String(numero ?? '').replace(/\D+/g, '');
}

export class ClienteFactory{
    static async create (nome, CPF, CEP, logradouro , bairro, cidade, UF, numero, complemento) {
        const CPFLimpo = limparNumero(CPF);
        const CEPLimpo = limparNumero(CEP);
        
        const [result] = await connection.execute(`
            INSERT INTO clientes
                (nome, CPF, CEP, logradouro, bairro, cidade, UF, numero, complemento)
                VALUES(?,?,?,?,?,?,?,?,?)
            `,   [nome, CPFLimpo, CEPLimpo, logradouro, bairro, cidade, UF, numero, complemento]);
            return{
                id: result.insertId,
                nome,
                CPF: CPFLimpo,
                CEP: CEPLimpo,
                logradouro,
                bairro,
                cidade,
                UF,
                numero,
                complemento
            }
            
    }
}