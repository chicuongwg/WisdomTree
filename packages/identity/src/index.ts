export type Identity = {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  avatarUrl?: string;
  disabled: boolean;
};

export interface IdentityProvider {
  resolve(request: Request): Promise<Identity | null>;
  beginSignIn(request: Request): Promise<Response>;
  completeSignIn(request: Request): Promise<Response>;
  signOut(request: Request): Promise<Response>;
  getProfile(identityId: string): Promise<Identity | null>;
}
