import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

export async function captureAvatar(userIdOrName) {
    const url = `https://habitica.com/profile/${userIdOrName}`;
    const file = `avatar_${userIdOrName}.png`
    const pathAvatar = path.join('./assets/users', file)


    const browser = await puppeteer.launch({
        headless: false, // pode mudar para false pra ver o que tá acontecendo
        defaultViewport: { width: 1024, height: 768 },
    });


    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.type('#usernameInput', 'are3380@gmail.com');
    await page.type('#passwordInput', 'duduzinho05');
    await page.click('button');
    // aguarde redirecionamento ou carregamento
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Espera o avatar carregar na página
    await page.waitForSelector('.avatar');

    // Seleciona a imagem do avatar
    const avatarPage = await page.$('.modal-body');
    const avatarElement = await avatarPage.$('.avatar');

    if (!avatarElement) {
        console.log('Avatar não encontrado!');
        await browser.close();
        return;
    }

    // Captura o screenshot só do avatar (bounding box)
    const boundingBox = await avatarElement.boundingBox();

    if (!boundingBox) {
        console.log('Erro ao pegar as dimensões do avatar');
        await browser.close();
        return;
    }

    try {
        // Tirar screenshot do avatar específico
        await avatarElement.screenshot({
            path: pathAvatar,
            clip: {
                x: boundingBox.x - 147,
                y: boundingBox.y - 41,
                width: Math.min(boundingBox.width, 141),
                height: Math.min(boundingBox.height, 147),
            },
        });
        await browser.close();
    } catch (error) {
        console.log("Deu erro ao gerar a imagem")
    }

    return pathAvatar
}