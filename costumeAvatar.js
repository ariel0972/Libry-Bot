import Canvas from "@napi-rs/canvas"
import fs from "fs/promises"

/**
 * 
 * @param {object} costume - O objeto contendo a aparência
 * @param {string} Path - O caminho do arquivo
 */

export async function GerarAvatar(costume, Path) {
    const canvaswidth = 140
    const canvasHeight = 147

    const canvas = Canvas.createCanvas(canvaswidth, canvasHeight)
    const ctx = canvas.getContext('2d');

    const layers = []
    const baseURL = 'https://s3.amazonaws.com/habitica-assets/mobileApp/images/'

    if (costume.preferences.background) {
        layers.push({
            url: `${baseURL}background_${costume.preferences.background}.png`,
            x: 0,
            y: 0,
        })
    }

    // if (costume.currentMount){
    //     layers.push({
    //         url: `${baseURL}Mount_Body_${costume.currentMount}.png`,
    //         x: 20,
    //         y: 0,
    //     })
    // }

    const costumeX = 25;
    const costumeY = 25;

    if (costume.preferences.chair && costume.preferences.chair !== 'none') {
        layers.push({ url: `${baseURL}chair_${costume.preferences.chair}.png`, x: costumeX, y: costumeY });
    }
    if (costume.back && !costume.back.includes('_base_0')) {
        layers.push({ url: `${baseURL}${costume.back}.png`, x: costumeX, y: costumeY });
    }
    if (costume.preferences.shirt) {
        layers.push({ url: `${baseURL}${costume.preferences.size}_shirt_${costume.preferences.shirt}.png`, x: costumeX, y: costumeY });
    }
    if (costume.preferences.skin) {
        layers.push({ url: `${baseURL}skin_${costume.preferences.skin}.png`, x: costumeX, y: costumeY });
    }

    ['base', 'bangs', 'beard', 'mustache'].forEach(e => {
        if (costume.preferences.hair[e]) {
            layers.push({
                url: `${baseURL}hair_${e}_${costume.preferences.hair[e]}_${costume.preferences.hair.color}.png`,
                x: costumeX,
                y: costumeY,
            })
        }
    })

    if (costume.armor && !costume.armor.includes('_base_0')) {
        layers.push({
            url: `${baseURL}broad_${costume.armor}.png`,
            x: costumeX,
            y: costumeY,
        })
    }

    ['eyewear', 'head', 'weapon', 'shield', 'body', 'headAccessory'].forEach(e => {
        if (costume[e] && !costume[e].includes('_base_0')) {
            let extension = '.png'
            if (['head_special_1', 'broad_armor_special_1', 'head_special_0', 'armor_special_0'].includes(costume[e])) {
                extension = '.gif'
            }
            layers.push({
                url: `${baseURL}${costume[e]}${extension}`,
                x: costumeX,
                y: costumeY
            })
        }
    })

    if (costume.preferences.hair.flower) {
        layers.push({
            url: `${baseURL}hair_flower_${costume.preferences.hair.flower}.png`,
            x: costumeX,
            y: costumeY,
        })
    }

    for (const layer of layers) {
        try {
            const image = await Canvas.loadImage(layer.url)
            ctx.drawImage(image, layer.x, layer.y)
        } catch (error) {
            console.warn(`Não foi possível carregar a imagem na camada: ${layer.url} Error: ${error.message}`)
        }
    }

    const buffer = canvas.toBuffer('image/png')
    return buffer
}


// const meuAvatarCostume = {
//     currentMount: 'Wolf-Shade',

//     head: 'head_special_fall2025Mage',
//     armor: "armor_special_fall2025Mage",
//     weapon: "weapon_special_fall2025Mage",
//     shield: 'shield_base_0',
//     back: 'back_special_anniversary',
//     body: "body_special_anniversary",
//     eyewear: "eyewear_special_blackHalfMoon",
//     headAccessory: '',
//     preferences: {
//         hair: {
//             color: 'brown',
//             base: 0,
//             bangs: 1,
//             beard: 0,
//             mustache: 0,
//             flower: 7
//         },
//         skin: 'f5a76e',
//         shirt: 'black',
//         chair: 'none',
//         size: 'slim',
//         background: 'thunderstorm'
//     }
// }

// // 2. Chame a função para gerar a imagem
// GerarAvatar(meuAvatarCostume, './assets/users/meu_avatar.png')
//     .catch(err => console.error('Ocorreu um erro ao gerar o avatar:', err));