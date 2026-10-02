/** Candidate locations for statements by already researched official publishers. Being on this
 * list never proves a claim: fetched excerpts, attribution and the normal verifier still apply.
 * Shared publishing platforms and community forums deliberately have no blanket permission. */
export const PRIMARY_EVIDENCE_POLICY_VERSION = 'official-evidence-locations-v2';
export const PRIMARY_EVIDENCE_HOSTS = [
  'ethereum.org', 'blog.ethereum.org', 'bitcoincore.org', 'chainalysis.com', 'coinmetrics.io',
  'sec.gov', 'aave.com', 'uniswap.org', 'blog.uniswap.org',
  'blog.chain.link', 'chain.link', 'docs.chain.link', 'docs.compound.finance', 'compound.finance',
  'docs.compound.xyz', 'compound.xyz',
  'fincen.gov', 'blog.celestia.org', 'celestia.org', 'blog.arbitrum.io',
  'solana.com', 'blog.sui.io', 'tether.io', 'writings.flashbots.net',
  'eigenlabs.org', 'filecoin.io', 'electriccoin.co',
  'getmonero.org', 'blog.blockstream.com', 'consensys.io', 'metamask.io',
  'coinmetrics.substack.com', 'stellar.org', 'blog.quicknode.com', 'polygon.technology',
  'pyth.network', 'optimism.io', 'ondo.finance', 'wormhole.com', 'layerzero.network',
  'morpho.org', 'safe.global', 'phantom.com', 'zama.org', 'ens.domains',
  'walletconnect.com', 'starknet.io', 'bnbchain.org', 'lightning.engineering',
  'circle.com', 'paxos.com', 'bis.org', 'fsb.org',
] as const;
