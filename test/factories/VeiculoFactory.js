import { connection } from "../../src/configs/Database.js";

export class VeiculoFactory{
    static async create (modelo, placa, ano, cor, valor, idCliente, idMontadora) {
        const [result] = await connection.execute(`
            INSERT INTO veiculos
                (modelo, placa, ano, cor, valor, idCliente, idMontadora)
                VALUES(?,?,?,?,?,?,?)
            `, [modelo, placa, ano, cor, valor, idCliente, idMontadora]
        );
        return{
            id: result.insertId,
            modelo,
            placa,
            ano,
            cor,
            valor,
            idCliente,
            idMontadora
        }
            
    }
}