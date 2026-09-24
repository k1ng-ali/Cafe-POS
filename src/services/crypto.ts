import type {
  EncryptedCatalogFile,
  DecryptedCatalogPayload,
  ShiftReportFile,
  Shift,
} from '../types';

// Helper: Convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate random UUIDv4
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Compute SHA-256 string hash
export async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// PBKDF2 Key Derivation
async function deriveAesKey(password: string, salt: Uint8Array, iterations = 100000): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations,
      hash: 'SHA-256',
    },
    passKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts catalog data using AES-256-GCM with PBKDF2-derived key.
 * Password is required for decryption.
 */
export async function encryptCatalog(
  payload: DecryptedCatalogPayload,
  password: string
): Promise<EncryptedCatalogFile> {
  if (!password || password.trim().length === 0) {
    throw new Error('Пароль для защиты каталога не может быть пустым');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 100000;

  const key = await deriveAesKey(password, salt, iterations);

  const enc = new TextEncoder();
  const jsonString = JSON.stringify(payload);
  const plainBytes = enc.encode(jsonString);

  // AES-GCM authenticated encryption (produces ciphertext + 128-bit auth tag)
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    plainBytes as any
  );

  const checksum = await sha256(jsonString);

  return {
    format: 'pos.catalog.v1',
    header: {
      cafeId: payload.cafeId,
      cafeName: payload.cafeName,
      version: payload.version,
      exportedAt: new Date().toISOString(),
      algorithm: 'AES-256-GCM',
      salt: bufferToBase64(salt),
      iv: bufferToBase64(iv),
      kdf: 'PBKDF2-SHA256',
      iterations,
      checksum,
    },
    encryptedPayload: bufferToBase64(ciphertextBuffer),
  };
}

/**
 * Decrypts catalog file with provided password.
 * Throws error if password is incorrect or file is damaged/tampered.
 */
export async function decryptCatalog(
  fileData: EncryptedCatalogFile,
  password: string
): Promise<DecryptedCatalogPayload> {
  if (!fileData || fileData.format !== 'pos.catalog.v1') {
    throw new Error('Неверный формат файла каталога');
  }

  const salt = base64ToBuffer(fileData.header.salt);
  const iv = base64ToBuffer(fileData.header.iv);
  const ciphertext = base64ToBuffer(fileData.encryptedPayload);

  let key: CryptoKey;
  try {
    key = await deriveAesKey(password, salt, fileData.header.iterations || 100000);
  } catch (e) {
    throw new Error('Ошибка криптографического движка при генерации ключа');
  }

  let decryptedBytes: ArrayBuffer;
  try {
    decryptedBytes = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as any,
      },
      key,
      ciphertext as any
    );
  } catch (e) {
    throw new Error('Неверный пароль или повреждённые криптографические данные');
  }

  const dec = new TextDecoder();
  const jsonString = dec.decode(decryptedBytes);
  const payload = JSON.parse(jsonString) as DecryptedCatalogPayload;

  // Verify internal checksum
  const currentChecksum = await sha256(jsonString);
  if (fileData.header.checksum && currentChecksum !== fileData.header.checksum) {
    throw new Error('Нарушена контрольная сумма содержимого каталога');
  }

  return payload;
}

/**
 * Creates an exportable shift report with tamper detection checksum.
 */
export async function createShiftReport(shift: Shift): Promise<ShiftReportFile> {
  const itemsMap = new Map<string, { productId: string; name: string; categoryName?: string; quantity: number; price: number; total: number }>();

  for (const sale of shift.sales) {
    for (const item of sale.items) {
      const existing = itemsMap.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.subtotal;
      } else {
        itemsMap.set(item.productId, {
          productId: item.productId,
          name: item.name,
          categoryName: item.categoryName,
          quantity: item.quantity,
          price: item.price,
          total: item.subtotal,
        });
      }
    }
  }

  const itemsSummary = Array.from(itemsMap.values()).sort((a, b) => b.quantity - a.quantity);

  const rawDataToHash = JSON.stringify({
    shiftId: shift.id,
    cafeId: shift.cafeId,
    employeeId: shift.employeeId,
    startTime: shift.startTime,
    endTime: shift.endTime,
    totalRevenue: shift.totalRevenue,
    salesCount: shift.salesCount,
    paymentBreakdown: shift.paymentBreakdown,
  });

  const checksum = await sha256(rawDataToHash);

  const report: ShiftReportFile = {
    format: 'pos.report.v1',
    header: {
      cafeId: shift.cafeId,
      cafeName: shift.cafeName,
      shiftId: shift.id,
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      version: 1,
      startTime: shift.startTime,
      endTime: shift.endTime || new Date().toISOString(),
      salesCount: shift.salesCount,
      totalRevenue: shift.totalRevenue,
      checksum,
      exportedAt: new Date().toISOString(),
    },
    data: {
      shift,
      itemsSummary,
      paymentSummary: {
        cash: shift.paymentBreakdown.cash,
        card: shift.paymentBreakdown.card,
        qr: shift.paymentBreakdown.qr,
      },
    },
    signature: checksum,
  };

  return report;
}

/**
 * Validates report structure and cryptographic checksum.
 */
export async function verifyShiftReport(report: ShiftReportFile): Promise<boolean> {
  if (report.format !== 'pos.report.v1') {
    throw new Error('Неизвестный формат файла отчёта');
  }

  if (!report.header?.shiftId || !report.data?.shift) {
    throw new Error('Неполные данные в файле отчёта');
  }

  const { shift } = report.data;
  const rawDataToHash = JSON.stringify({
    shiftId: shift.id,
    cafeId: shift.cafeId,
    employeeId: shift.employeeId,
    startTime: shift.startTime,
    endTime: shift.endTime,
    totalRevenue: shift.totalRevenue,
    salesCount: shift.salesCount,
    paymentBreakdown: shift.paymentBreakdown,
  });

  const calculated = await sha256(rawDataToHash);
  if (calculated !== report.header.checksum || calculated !== report.signature) {
    throw new Error('Файл отчёта повреждён или был изменён! Контрольная сумма не совпадает.');
  }

  return true;
}
