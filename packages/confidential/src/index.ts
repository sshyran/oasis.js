import { Nonce, PublicKey, PrivateKey } from '@oasis/types';
import { bytes } from '@oasis/common';
import { Deoxysii } from './aead';
import { KeyStore } from './key-store';
import nacl from './tweetnacl';

const aead = new Deoxysii();

/**
 * encrypt takes the given input and returns the encrypted wire format:
 * NONCE || PUBLIC_KEY || CIPHER.
 */
async function encrypt(
  nonce: Nonce,
  plaintext: Uint8Array,
  peerPublicKey: PublicKey,
  publicKey: PublicKey,
  privateKey: PrivateKey
): Promise<Uint8Array> {
  let ciphertext = await aead.seal(
    nonce,
    plaintext,
    new Uint8Array([]),
    peerPublicKey,
    privateKey
  );
  return bytes.concat([nonce, publicKey, ciphertext]);
}

/**
 * decrypt takes the given input and returns the unpacked Decryption payload.
 *
 * @param ciphertext is of the form NONCE || PUBLIC_KEY || CIPHER.
 */
async function decrypt(
  encryption: Uint8Array,
  secretKey: PrivateKey
): Promise<Decryption> {
  let [nonce, peerPublicKey, ciphertext] = splitEncryptedPayload(encryption);
  let plaintext = await aead.open(
    nonce,
    ciphertext,
    Uint8Array.from([]),
    peerPublicKey,
    secretKey
  );
  return {
    nonce,
    plaintext,
    peerPublicKey
  };
}

function nonce(): Nonce {
  return nacl.randomBytes(15);
}

/**
 * Splits the given ciphertext into it's constituent components.
 *
 * @param ciphertext is of the form NONCE || PUBLIC_KEY || CIPHER.
 */
function splitEncryptedPayload(
  encryption: Uint8Array
): [Uint8Array, Uint8Array, Uint8Array] {
  if (encryption.length < 15 + 32) {
    throw new Error(`Invalid encryption: ${encryption}`);
  }
  let nonce = new Uint8Array(15);
  let publicKey = new Uint8Array(32);
  let ciphertext = new Uint8Array(
    encryption.length - nonce.length - publicKey.length
  );

  nonce.set(encryption.slice(0, nonce.length), 0);
  publicKey.set(
    encryption.slice(nonce.length, nonce.length + publicKey.length)
  );
  ciphertext.set(encryption.slice(nonce.length + publicKey.length));

  return [nonce, publicKey, ciphertext];
}

type Decryption = {
  nonce: Nonce;
  plaintext: Uint8Array;
  peerPublicKey: PublicKey;
};

export type AeadKeys = {
  peerPublicKey: PublicKey;
  publicKey: PublicKey;
  privateKey: PrivateKey;
};

export { encrypt, decrypt, nonce, Deoxysii, KeyStore };
