const W3S_API_URL = 'https://api.web3.storage';

let apiToken: string | null = null;

export function setWeb3StorageToken(token: string) {
  apiToken = token;
}

export async function uploadToIPFS(data: string): Promise<string> {
  if (!apiToken) {
    return simulateIPFSUpload(data);
  }

  try {
    const blob = new Blob([data], { type: 'application/octet-stream' });

    const response = await fetch(`${W3S_API_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'X-Name': `chronovault-capsule-${Date.now()}`,
      },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`IPFS upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.cid;
  } catch (error) {
    throw new Error(
      `Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function fetchFromIPFS(cid: string): Promise<string> {
  if (cid.startsWith('sim_')) {
    return simulateIPFSFetch(cid);
  }

  const gateways = [
    `https://${cid}.ipfs.w3s.link`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ];

  for (const url of gateways) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    } catch {
      continue;
    }
  }

  throw new Error('Failed to fetch from IPFS. All gateways failed.');
}

const simulatedStorage = new Map<string, string>();

async function simulateIPFSUpload(data: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 800));
  const cid = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  simulatedStorage.set(cid, data);
  return cid;
}

async function simulateIPFSFetch(cid: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  const data = simulatedStorage.get(cid);
  if (!data) {
    throw new Error('Capsule data not found in storage.');
  }
  return data;
}
