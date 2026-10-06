const os = require("os");
const { CANELA_LAN_SERVER_PORT } = require("./lan-constants");

function isVirtualInterface(name) {
  const n = name.toLowerCase();
  return (
    n.includes("vethernet") ||
    n.includes("virtual") ||
    n.includes("vmware") ||
    n.includes("hyper-v") ||
    n.includes("loopback") ||
    n.includes("vpn") ||
    n.includes("tailscale") ||
    n.includes("wsl")
  );
}

function listLanAddresses() {
  const ifaces = os.networkInterfaces();
  const rows = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs || isVirtualInterface(name)) continue;
    for (const a of addrs) {
      const family = a.family;
      if (family !== "IPv4" && family !== 4) continue;
      if (a.internal) continue;
      rows.push({
        interface: name,
        address: a.address,
        netmask: a.netmask,
      });
    }
  }
  return rows;
}

function pickSuggestedAddress(rows) {
  if (!rows.length) return null;
  const ethernet = rows.find((r) => /ethernet|eth\b/i.test(r.interface) && !/virtual/i.test(r.interface));
  if (ethernet) return ethernet.address;
  const wifi = rows.find((r) => /wi-?fi|wlan|wireless/i.test(r.interface));
  if (wifi) return wifi.address;
  return rows[0].address;
}

function buildNetworkHints(port = CANELA_LAN_SERVER_PORT) {
  const addresses = listLanAddresses();
  const suggestedIp = pickSuggestedAddress(addresses);
  const terminalBaseUrl = suggestedIp ? `http://${suggestedIp}:${port}` : "";
  return {
    addresses,
    suggestedIp,
    port,
    terminalBaseUrl,
    dhcpWarning:
      "Se este PC usa IP automático (DHCP), fixe um IP no roteador ou defina IP estático — assim os terminais não perdem o servidor.",
  };
}

module.exports = { listLanAddresses, buildNetworkHints };
