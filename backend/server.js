import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_URL = "https://api.pinata.cloud";

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });

  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.on("data", (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 10_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function normalizeName(name) {
  if (typeof name !== "string" || !name.trim()) {
    return `netsanet-record-${Date.now()}.enc`;
  }

  return name.trim();
}

async function pinEncryptedFile({ bytesBase64, name, keyvalues }) {
  if (!PINATA_JWT) {
    throw new Error("PINATA_JWT is not configured on the backend");
  }

  if (!bytesBase64) {
    throw new Error("bytesBase64 is required");
  }

  const fileBytes = Buffer.from(bytesBase64, "base64");
  const filename = normalizeName(name);
  const file = new Blob([fileBytes], { type: "application/octet-stream" });

  const formData = new FormData();
  formData.append("file", file, filename);
  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: filename,
      ...(keyvalues && typeof keyvalues === "object" ? { keyvalues } : {}),
    }),
  );

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  return {
    cid: result.IpfsHash,
    size: result.PinSize,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && req.url === "/api/ipfs/pin") {
    try {
      const body = await readJsonBody(req);
      const result = await pinEncryptedFile(body);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Netsanet upload API running on http://localhost:${PORT}`);
});
