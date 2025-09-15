import {
  createBot,
  createFlow,
  MemoryDB,
  createProvider,
  addKeyword,
} from "@bot-whatsapp/bot";
import { BaileysProvider, handleCtx } from "@bot-whatsapp/provider-baileys";

const flowBienvenida = addKeyword("hola").addAnswer(
  "¡Bienvenido(a) Administradora Serdeco C.A., Estamos aca para ayudarle con la gestión y pagos de tus servicios de Aseo urbano y Relleno Sanitario Escribe *Menu* para ver las opciones disponibles."
);

const flowMenu = addKeyword(["hola", "menu"]).addAnswer([
  "¿Qué deseas hacer?",
  "1️⃣ Ver Deuda",
  "2️⃣ Consultar mi Cuenta Contrato",
]);

const flowOpcion1 = addKeyword("1")
  .addAnswer("Ingresa tu número de cuenta contrato de 12 dígitos", {
    capture: true,
  })
  .addAction(async (ctx, { flowDynamic }) => {
    const cuentaContrato = ctx.body;

    const respuesta = await fetch(
      `http://10.16.2.99:8080/CorpoelecRest/rest/OficinaService/SaldoDetalle/${cuentaContrato}`
    );
    const datos = await respuesta.json();

    const deudaAseo = Number(datos.deudaAseoTotal) || 0;
    const deudaRelleno = Number(datos.deudaRellenoTotal) || 0;
    const total = deudaAseo + deudaRelleno;

    await flowDynamic(
      `📄 La deuda presente para la cuenta contrato *${cuentaContrato}*:\nAseo Urbano: *${deudaAseo}*\n Relleno Sanitario: *${deudaRelleno}*\n Total a pagar: *${total}*`
    );
  });

const flowOpcion2 = addKeyword("2")
  .addAnswer("Ingresa tu número de cedula", {
    capture: true,
  })
  .addAction(async (ctx, { flowDynamic }) => {
    const cedula = ctx.body;

    const respuesta = await fetch(
      `http://10.200.10.249:3002/api/getUsuarioCatastro`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cedula),
      }
    );
    const datos = await respuesta.json();

    await flowDynamic(
      `Las cuentas contrato asociadas a la cédula *${cedula}* son:\n${datos
        .map((dato) => `- ${dato.cuentaContrato}`)
        .join("\n")}`
    );
  });

/**
 *
 */
const main = async () => {
  const provider = createProvider(BaileysProvider);

  provider.initHttpServer(3002);

  provider.http.server.post(
    "/send-message",
    handleCtx(async (bot, req, res) => {
      const body = req.body;
      //console.log(body)

      const message = body.message;
      const mediaUrl = body.mediaUrl;

      await bot.sendMessage(process.env.FRIEND_NUMBER, "mensaje¡", {
        media: mediaUrl,
      });
      res.end("esto es del server de serdeco");
    })
  );

  await createBot({
    flow: createFlow([flowBienvenida, flowMenu, flowOpcion1, flowOpcion2]),
    database: new MemoryDB(),
    provider,
  });
};

main();
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
