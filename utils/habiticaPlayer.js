const dotenv = require('dotenv')
dotenv.config()
const { AUTHOR_ID, AUTHOR_TOKEN } = process.env
// import User from '../database/models/user'

/**
 * @typedef { 'user' | 'tasks/user' | 'tasks/{ID}' | 'groups/party/chat' | 'groups/party'} path
 * @typedef { 'GET' | 'POST' | 'PUT' | 'DELETE' } HttpMethod 
 */

/** 
 * @param {string} userID - ID de usuário do Habitica
 * @param {string} tokenAPI - O tokne único de API do Habitica.
 * @param {path} [Path='user'] - indica o caminho do link
 * @param {HttpMethod} [method='GET'] - O método HTTP usado para a busca de dados. Method padrão é GET
 * @param {object | null} [body=null] - O corpo da requisição Apenas em method POST ou PUT
 * @returns {Promise<object>} Os dados de usuário da API.
 * @throws {Error} Se a chamada da API falhar.
 * 
 * @since 2025 by Ariel - v0.2.1
 */
async function fetchHabiticaUser(userID, tokenAPI, Path = 'user', method = 'GET', body = null) {
    const HEADERS = {
        "x-client": `${AUTHOR_ID}-BotDiscord`,
        "x-api-user": userID,
        "x-api-key": tokenAPI,
        'Content-Type': "application/json",
    }

    const options = {
        method: method,
        headers: HEADERS,
    }

    if (body) {
        options.body = JSON.stringify(body)
    }

    // Teste de busca de dados da API do Habitica.
    try {
        const res = await fetch(`https://habitica.com/api/v3/${Path}`, options)

        if (!res.ok) {
            const errorData = await res.json().catch(() => null)
            const errorMessage = errorData?.message || res.statusText
            throw new Error(`Erro na API do Habitica: ${res.status} - ${errorMessage}`)
        }

        if (res.status === 204) {
            return { success: true, message: `Operação ${method} realizada com sucesso`, }
        }

        const jsonRes = await res.json()
        // console.log(jsonRes.data)
        return jsonRes.data

    } catch (error) {
        console.error('Falha ao contatar a API do habitica', error)
        throw new Error('Não foi possivel conectar à API do Habitica. Verifique se os dados foram inseridos corretamente')
    }
}

module.exports = {
    fetchHabiticaUser
}


