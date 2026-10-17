// Verification preload: tests may use loopback stubs and a disposable local database, never providers.
import net from "node:net";
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args: unknown[]) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = typeof first === "object" && first !== null ? first as { host?: string; path?: string; lookup?: (...args: any[]) => any } : {};
  const host = options.host ?? (typeof args[1] === "string" ? args[1] : "localhost");
  const local = (address: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(address);
  if (!options.path && !local(host)) {
    if (!options.lookup) throw new Error(`Test external network denied: ${host}`);
    const lookup = options.lookup;
    options.lookup = (hostname, settings, done) => lookup(hostname, settings, (error: Error | null, address: string | { address: string }[], family: number) => {
      const addresses = Array.isArray(address) ? address.map(a => a.address) : [address];
      if (!error && !addresses.every(local)) return done(new Error(`Test external network denied: ${host}`));
      done(error, address, family);
    });
  }
  return Reflect.apply(connect, this, args);
} as typeof connect;
