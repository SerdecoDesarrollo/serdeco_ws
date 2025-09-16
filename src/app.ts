import {
  createBot,
  createFlow,
  MemoryDB,
  createProvider,
  addKeyword,
} from "@bot-whatsapp/bot";
import { BaileysProvider, handleCtx } from "@bot-whatsapp/provider-baileys";

// Flujo de bienvenida
const flowBienvenida = addKeyword(["hola", "Buenas"]).addAnswer(
  "👋 ¡Bienvenido(a) a Administradora Serdeco C.A.!\nEstamos aquí para ayudarte con la gestión y pagos de tus servicios de Aseo Urbano y Relleno Sanitario.\nEscribe *Menu* para ver las opciones disponibles."
);

//  Flujo de menú principal
const flowMenu = addKeyword(["menu"]).addAnswer([
  "¿Qué deseas hacer?",
  "1️⃣ Ver Deuda",
  "2️⃣ Consultar mi Cuenta Contrato",
]);

// Flujo para consultar deuda por cuenta contrato
const flowOpcion1 = addKeyword("1")
  .addAnswer("🔢 Ingresa tu número de cuenta contrato de 12 dígitos:", {
    capture: true,
  })
  .addAction(async (ctx, { flowDynamic }) => {
    const cuentaContrato = ctx.body.trim();

    await flowDynamic("🔎 Consultando tu deuda, por favor espera...");

    if (!/^\d{12}$/.test(cuentaContrato)) {
      await flowDynamic(
        "⚠️ El número ingresado no tiene 12 dígitos válidos. Verifica e intenta nuevamente."
      );
      return;
    }

    // Cálculo del residuo y dígito verificador
    const multiplicadores = [7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;

    for (let i = 0; i < 12; i++) {
      const digito = parseInt(cuentaContrato[i], 10);
      suma += digito * multiplicadores[i];
    }

    const residuo = suma % 11;
    const digitoVerificador =
      residuo === 0 ? 1 : residuo === 1 ? 0 : 11 - residuo;

    try {
      const respuesta = await fetch(
        `http://10.16.2.99:8080/CorpoelecRest/rest/OficinaService/SaldoDetalle/${cuentaContrato}`
      );
      const datos = await respuesta.json();

      const deudaAseo = Number(datos.deudaAseoTotal) || 0;
      const deudaRelleno = Number(datos.deudaRellenoTotal) || 0;
      const total = deudaAseo + deudaRelleno;

      if (total === 0) {
        await flowDynamic(
          `✅ La cuenta contrato *${cuentaContrato}* no presenta deudas actualmente.`
        );
      } else {
        await flowDynamic(
          `📄 Deuda actual para la cuenta contrato *${cuentaContrato}.${digitoVerificador}*:\n• Aseo Urbano: *${deudaAseo}*\n• Relleno Sanitario: *${deudaRelleno}*\n💰 Total a pagar: *${total}*`
        );

        await flowDynamic([
          `🧾 Puedes pagar tu deuda siguiendo estos pasos: \n 1️⃣Ingrese a su banco de preferencia.\n 2️⃣ Selecciona Pagos y busca la opción en el menú *Pago de Servicios Públicos*.\n3️⃣Selecciona *CORPOELEC* en la lista de servicios disponibles. \n 4️⃣ Ingresa tu número de cuenta contrato seguido del número final de la factura el tuyo es: *${cuentaContrato}${digitoVerificador}*`,
        ]);
      }
    } catch (error) {
      console.error("Error consultando deuda:", error);
      await flowDynamic(
        "❌ No se pudo consultar la deuda en este momento. Intenta nuevamente más tarde."
      );
    }
  });

// Flujo para consultar cuentas contrato por cédula
const flowOpcion2 = addKeyword("2")
  .addAnswer("🆔 Ingresa tu número de cédula:", {
    capture: true,
  })
  .addAction(async (ctx, { flowDynamic }) => {
    const cedula = ctx.body.trim();

    await flowDynamic(
      "🔎 Consultando tus cuentas contrato, por favor espera..."
    );

    try {
      const respuesta = await fetch(
        `http://10.200.10.249:3003/api/postUsuarioCatastro`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cedula }),
        }
      );

      const datos = await respuesta.json();

      if (!Array.isArray(datos) || datos.length === 0) {
        await flowDynamic(
          `⚠️ No se encontraron cuentas contrato asociadas a la cédula *${cedula}*. Verifica que esté correcta o intenta más tarde.`
        );
        return;
      }

      const cuentasUnicas: string[] = [];
      datos.forEach((dato) => {
        if (
          dato.cuentaContrato &&
          !cuentasUnicas.includes(dato.cuentaContrato)
        ) {
          cuentasUnicas.push(dato.cuentaContrato);
        }
      });

      if (cuentasUnicas.length === 0) {
        await flowDynamic(
          `⚠️ No se encontraron cuentas válidas asociadas a la cédula *${cedula}*.`
        );
        return;
      }

      await flowDynamic(
        `📌 Las cuentas contrato asociadas a la cédula *${cedula}* son:\n${cuentasUnicas
          .map((cuenta) => `- ${cuenta}`)
          .join("\n")}`
      );
    } catch (error) {
      console.error("Error consultando cuentas contrato:", error);
      await flowDynamic(
        "❌ No se pudo realizar la consulta en este momento. Intenta nuevamente más tarde."
      );
    }
  });

// Inicialización del bot
const main = async () => {
  const provider = createProvider(BaileysProvider);
  provider.initHttpServer(3002);

  provider.http.server.post(
    "/send-message",
    handleCtx(async (bot, req, res) => {
      const { message, mediaUrl } = req.body;

      await bot.sendMessage(process.env.FRIEND_NUMBER, message || "mensaje¡", {
        media: mediaUrl,
      });

      res.end("✅ Mensaje enviado desde el servidor de Serdeco.");
    })
  );

  await createBot({
    flow: createFlow([flowBienvenida, flowMenu, flowOpcion1, flowOpcion2]),
    database: new MemoryDB(),
    provider,
  });
};

main();
