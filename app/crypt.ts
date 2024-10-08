const buff_to_base64 = (buff: Uint8Array) =>
  btoa(
    new Uint8Array(buff).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      "",
    ),
  );

const base64_to_buf = (b64: string) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const enc = new TextEncoder();
const dec = new TextDecoder();

export async function encode(data: string, password: string) {
  const encryptedData = await encryptData(data, password);
  return encryptedData;
}

export async function decode(encryptedData: string, password: string) {
  const decryptedData = await decryptData(encryptedData, password);
  return decryptedData;
}

const getPasswordKey = (password: string) =>
  crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);

const deriveKey = (passwordKey: CryptoKey, salt: Uint8Array, keyUsage: any) =>
  crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    keyUsage,
  );

async function encryptData(secretData: string, password: string) {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const passwordKey = await getPasswordKey(password);
    const aesKey = await deriveKey(passwordKey, salt, ["encrypt"]);
    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      enc.encode(secretData),
    );

    const encryptedContentArr = new Uint8Array(encryptedContent);
    let buff = new Uint8Array(
      salt.byteLength + iv.byteLength + encryptedContentArr.byteLength,
    );
    buff.set(salt, 0);
    buff.set(iv, salt.byteLength);
    buff.set(encryptedContentArr, salt.byteLength + iv.byteLength);
    const base64Buff = buff_to_base64(buff);
    return base64Buff;
  } catch (e) {
    console.error(e);
    return "";
  }
}

async function decryptData(encryptedData: string, password: string) {
  try {
    const encryptedDataBuff = base64_to_buf(encryptedData);
    const salt = encryptedDataBuff.slice(0, 16);
    const iv = encryptedDataBuff.slice(16, 16 + 12);
    const data = encryptedDataBuff.slice(16 + 12);
    const passwordKey = await getPasswordKey(password);
    const aesKey = await deriveKey(passwordKey, salt, ["decrypt"]);
    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      data,
    );
    return dec.decode(decryptedContent);
  } catch (e) {
    console.error(e);
    return "";
  }
}
