import { createRemoteJWKSet, jwtVerify } from "jose";

export type GoogleOidcConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleClaims = {
  sub: string;
  email: string;
  emailVerified: boolean;
};

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function createGoogleOidcClient(config: GoogleOidcConfig) {
  return {
    authorizationUrl(state: string): string {
      return `${AUTH_ENDPOINT}?${new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: "code",
        scope: "openid email",
        state,
        prompt: "select_account",
      })}`;
    },

    async exchangeCode(code: string): Promise<GoogleClaims | null> {
      const response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!response.ok) return null;
      const { id_token: token } = (await response.json()) as { id_token?: string };
      if (!token) return null;
      try {
        const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
          issuer: ["https://accounts.google.com", "accounts.google.com"],
          audience: config.clientId,
        });
        return typeof payload.sub === "string" && typeof payload.email === "string"
          ? { sub: payload.sub, email: payload.email, emailVerified: payload.email_verified === true }
          : null;
      } catch {
        return null;
      }
    },
  };
}
