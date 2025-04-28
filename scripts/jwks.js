import jose from "node-jose";
import fs from "fs/promises"

const generate = async () => {
    const keyStore = jose.JWK.createKeyStore();

    // ensure the 'public' directory exists
    await fs.mkdir("public", { recursive: true });

    await keyStore.generate("RSA", 2048, { alg: "RS256", use: "sig" });
    await fs.writeFile("public/keys.json", JSON.stringify(keyStore.toJSON(true), null, "  "))
    await fs.writeFile("public/jwks.json", JSON.stringify(keyStore.toJSON(), null, "  "))
    console.log(" --- Public JWKS --- ")
    console.log(JSON.stringify(keyStore.toJSON()));
};

generate();