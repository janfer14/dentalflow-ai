// otplib's transitive dependency (@scure/base) ships ESM-only, which ts-jest
// cannot transform out of the box. Since 2FA TOTP logic isn't what these
// e2e/module-wiring tests exercise, stub the module rather than pull babel
// into the toolchain just to parse a dependency's ESM syntax.
export function generateSecret(): string {
  return 'MOCKSECRETMOCKSECRET';
}

export function generateURI(): string {
  return 'otpauth://totp/mock';
}

export function verify(): Promise<boolean> {
  return Promise.resolve(true);
}
