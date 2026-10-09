import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { useMongoAuthState } from './mongoAuthState';

let waSocket: any = null;
let currentQRCode: string | null = null;
let isConnected = false;
let connectedPhone: string | null = null;
let mongoClearState: (() => Promise<void>) | null = null;

export const initWhatsAppGateway = async () => {
  try {
    const { state, saveCreds, clearState } = await useMongoAuthState();
    mongoClearState = clearState;
    const { version } = await fetchLatestBaileysVersion();

    waSocket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['Miracle Laundry', 'Chrome', '1.0.0'],
    });

    waSocket.ev.on('creds.update', saveCreds);

    waSocket.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQRCode = await QRCode.toDataURL(qr);
        isConnected = false;
        console.log('[WhatsApp Gateway] New QR Code generated. Scan in Settings page!');
      }

      if (connection === 'open') {
        isConnected = true;
        currentQRCode = null;
        const jid = waSocket.user?.id || '';
        connectedPhone = jid.split(':')[0] || jid.split('@')[0] || 'Shop Phone';
        console.log(`[WhatsApp Gateway] Connected successfully to +${connectedPhone} (Saved in MongoDB Atlas)`);
      }

      if (connection === 'close') {
        isConnected = false;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(
          `[WhatsApp Gateway] Connection closed. StatusCode: ${statusCode}. Reason: ${
            lastDisconnect?.error?.message || 'Unknown'
          }. Reconnecting: ${shouldReconnect}`
        );

        if (shouldReconnect) {
          setTimeout(() => {
            initWhatsAppGateway();
          }, 5000);
        } else {
          // Logged out: Clear auth session from MongoDB Atlas
          currentQRCode = null;
          connectedPhone = null;
          if (mongoClearState) {
            await mongoClearState();
          }
        }
      }
    });
  } catch (err: any) {
    console.error('[WhatsApp Gateway Init Error]:', err.message);
  }
};

export const getWhatsAppStatus = () => {
  return {
    connected: isConnected,
    qrCode: currentQRCode,
    phone: connectedPhone,
  };
};

export const disconnectWhatsApp = async () => {
  try {
    if (waSocket) {
      await waSocket.logout();
      waSocket = null;
    }
  } catch (err) {}
  isConnected = false;
  currentQRCode = null;
  connectedPhone = null;
  if (mongoClearState) {
    await mongoClearState();
  }
  setTimeout(() => {
    initWhatsAppGateway();
  }, 2000);
  return true;
};

// Send Automated Message Helper
export const sendAutomatedWhatsAppMessage = async (mobile: string, text: string) => {
  if (!waSocket || !isConnected) {
    console.log('[WhatsApp Gateway] Message skipped: Gateway is not connected.');
    return false;
  }

  try {
    const rawDigits = mobile.replace(/\D/g, '');
    const formattedNum = rawDigits.length === 10 ? '91' + rawDigits : rawDigits;
    const jid = `${formattedNum}@s.whatsapp.net`;

    await waSocket.sendMessage(jid, { text });
    console.log(`[WhatsApp Gateway] Automated message sent successfully to +${formattedNum}`);
    return true;
  } catch (err: any) {
    console.error(`[WhatsApp Gateway Send Error to ${mobile}]:`, err.message);
    return false;
  }
};

// Send Automated Document (PDF Invoice) Helper
export const sendAutomatedWhatsAppDocument = async (
  mobile: string,
  pdfBuffer: Buffer,
  fileName: string,
  caption?: string
) => {
  if (!waSocket || !isConnected) {
    console.log('[WhatsApp Gateway] Document skipped: Gateway is not connected.');
    return false;
  }

  try {
    const rawDigits = mobile.replace(/\D/g, '');
    const formattedNum = rawDigits.length === 10 ? '91' + rawDigits : rawDigits;
    const jid = `${formattedNum}@s.whatsapp.net`;

    await waSocket.sendMessage(jid, {
      document: pdfBuffer,
      mimetype: 'application/pdf',
      fileName: fileName,
      caption: caption || undefined,
    });
    console.log(`[WhatsApp Gateway] PDF document ${fileName} sent successfully to +${formattedNum}`);
    return true;
  } catch (err: any) {
    console.error(`[WhatsApp Gateway Send Document Error to ${mobile}]:`, err.message);
    return false;
  }
};
