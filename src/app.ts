import { createBot, createFlow, MemoryDB, createProvider, addKeyword } from "@bot-whatsapp/bot";
import { BaileysProvider, handleCtx } from "@bot-whatsapp/provider-baileys";

const flowBienvenida = addKeyword("hola").addAnswer("Buenas¡¡ Bienvenido")

/**
 * 
 */
const main = async () => {

    const provider = createProvider(BaileysProvider)

    provider.initHttpServer(3002)

    provider.http.server.post("/send-message", handleCtx(async(bot, req, res) =>{
      const body = req.body
      //console.log(body)

      const message = body.message
      const mediaUrl = body.mediaUrl

      await bot.sendMessage(process.env.FRIEND_NUMBER, "mensaje¡", {
        media: mediaUrl
      })
      res.end("esto es del server de serdeco")
    }))

    await createBot({
        flow: createFlow([flowBienvenida]),
        database: new MemoryDB(),
        provider
    })
}

main()
/*
import { createBot, createFlow, MemoryDB, addKeyword, createProvider } from '@bot-whatsapp/bot';
import { BaileysProvider } from '@bot-whatsapp/provider-baileys';

const flowBienvenida = addKeyword('hola').addAnswer('¡Bienvenido!');

const main = async () => {
  const provider = createProvider(BaileysProvider);

  const bot = await createBot({
    flow: createFlow([flowBienvenida]),
    database: new MemoryDB(),
    provider,
  });

 await provider.sendMessage('+584168325363','Hola desde el bot configurado!');

};


main();*/
