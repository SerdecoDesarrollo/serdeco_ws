import {
  createBot,
  createFlow,
  MemoryDB,
  createProvider,
  addKeyword,
} from "@bot-whatsapp/bot";
import { BaileysProvider, handleCtx } from "@bot-whatsapp/provider-baileys";

// URLs de servicios
const URL_DEUDA =
  "http://10.16.2.99:8080/CorpoelecRest/rest/OficinaService/SaldoDetalle";
const URL_CATASTRO = "http://10.200.10.249:3002/api/getUsuarioCatastro";

// Flujo de bienvenida
const flowBienvenida = addKeyword("hola").addAnswer(
  "👋 ¡Bienvenido(a) a Administradora Serdeco C.A.!\nEstamos aquí para ayudarte con la gestión y pagos de tus servicios de Aseo Urbano y Relleno Sanitario.\n\nEscribe *menu* para ver las opciones disponibles."
);

// Menú principal
const flowMenu = addKeyword(["menu", "hola"]).addAnswer([
  "¿Qué deseas hacer?",
  "1️⃣ Ver Deuda",
  "2️⃣ Consultar mi Cuenta Contrato",
]);

// Consulta de deuda
const flowOpcion1 = addKeyword("1")
  .addAnswer("🔢 Ingresa tu número de cuenta contrato (12 dígitos):", {
    capture: true,
  })
  .addAction(async (ctx, { flowDynamic }) => {
    const cuentaContrato = ctx.body.trim();

    if (!/^\d{12}$/.test(cuentaContrato)) {
      return await flowDynamic(
        "⚠️ El número ingresado no es válido. Debe tener 12 dígitos."
      );
    }

    try {
      const res = await fetch(`${URL_DEUDA}/${cuentaContrato}`);
      const datos = await res.json();

      const deudaAseo = Number(datos.deudaAseoTotal) || 0;
      const deudaRelleno = Number(datos.deudaRellenoTotal) || 0;
      const total = deudaAseo + deudaRelleno;

      await flowDynamic(
        `Deuda actual para la cuenta *${cuentaContrato}*:\n` +
          ` Aseo Urbano: *${deudaAseo.toFixed(2)} Bs*\n` +
          ` Relleno Sanitario: *${deudaRelleno.toFixed(2)} Bs*\n` +
          `Total a pagar: *${total.toFixed(2)} Bs*`
      );
    } catch (error) {
      await flowDynamic(
        "❌ Ocurrió un error al consultar la deuda. Intenta nuevamente más tarde."
      );
    }
  });

const flowOpcion2 = addKeyword("2")
  .addAnswer("🆔 Ingresa tu número de cédula:", { capture: true })
  .addAction(async (ctx, { flowDynamic }) => {
    const cedula = ctx.body.trim();

    if (!/^\d+$/.test(cedula)) {
      return await flowDynamic("⚠️ La cédula ingresada no es válida.");
    }

    try {
      const res = await fetch(URL_CATASTRO, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cedula),
      });
      const datos = await res.json();

      if (!datos.length) {
        return await flowDynamic(
          `🔎 No se encontraron cuentas asociadas a la cédula *${cedula}*.`
        );
      }

      const cuentas = datos.map((d) => `🔹 ${d.cuentaContrato}`).join("\n");
      await flowDynamic(
        `📑 Cuentas asociadas a la cédula *${cedula}*:\n${cuentas}`
      );
    } catch (error) {
      await flowDynamic(
        "❌ Error al consultar las cuentas. Por favor, intenta más tarde."
      );
    }
  });

// Inicialización del bot
const main = async () => {
  const provider = createProvider(BaileysProvider);
  provider.initHttpServer(3002);

  // Endpoint para enviar mensajes desde el servidor
  provider.http.server.post(
    "/send-message",
    handleCtx(async (bot, req, res) => {
      const { message, mediaUrl } = req.body;

      await bot.sendMessage(
        process.env.FRIEND_NUMBER,
        message || "Nuevo mensaje",
        {
          media: mediaUrl,
        }
      );

      res.end("Mensaje enviado desde el servidor de Serdeco.");
    })
  );

  await createBot({
    flow: createFlow([flowBienvenida, flowMenu, flowOpcion1, flowOpcion2]),
    database: new MemoryDB(),
    provider,
  });
};

main();
