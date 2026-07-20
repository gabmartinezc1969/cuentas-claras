const CRED_ID_KEY = 'cc-webauthn-id';

function bufToBase64url(buf) {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuf(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(b64url.length + (4 - (b64url.length % 4)) % 4, '=');
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

export function isSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;
}

export function isRegistered() {
  return !!localStorage.getItem(CRED_ID_KEY);
}

export async function register() {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Cuentas Claras' },
      user: { id: userId, name: 'usuario-local', displayName: 'Usuario de Cuentas Claras' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
    },
  });
  localStorage.setItem(CRED_ID_KEY, bufToBase64url(credential.rawId));
}

export function unregister() {
  localStorage.removeItem(CRED_ID_KEY);
}

export async function authenticate() {
  const credId = localStorage.getItem(CRED_ID_KEY);
  if (!credId) return false;
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: base64urlToBuf(credId), type: 'public-key' }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  return !!assertion;
}
