export interface GoogleUser {
  id: string
  name?: string
  email?: string
}

export interface OAuthGrant {
  accessToken: string
  expiresAt: number
}

export interface CredentialResponse { credential?: string }
export interface TokenResponse {
  access_token?: string
  expires_in?: number | string
  token_type?: string
  scope?: string
  error?: string
}

/** Minimal surface of the official GIS APIs used by this application. */
export interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize(config: { client_id: string; nonce: string; auto_select: false; ux_mode: 'popup'; callback: (response: CredentialResponse) => void }): void
      renderButton(element: HTMLElement, options: { theme: 'filled_black'; size: 'large'; text: 'signin_with'; shape: 'rectangular'; click_listener: () => void }): void
      disableAutoSelect(): void
      cancel(): void
    }
    oauth2: {
      initTokenClient(config: {
        client_id: string
        scope: string
        include_granted_scopes: false
        login_hint: string
        prompt: ''
        callback: (response: TokenResponse) => void
        error_callback: (error: { type?: string }) => void
      }): { requestAccessToken(): void }
      hasGrantedAllScopes(response: TokenResponse, ...scopes: string[]): boolean
      revoke(accessToken: string, callback: () => void): void
    }
  }
}

export interface IdentityHandlers {
  onUser: (user: GoogleUser) => void
  onSignInStart: () => void
  onError: (error: Error) => void
}

export interface IdentityClient {
  renderButton(element: HTMLElement): void
  authorize(user: GoogleUser): Promise<OAuthGrant>
  cancelAuthorization(): void
  signOut(): void
  revoke(accessToken: string): void
  dispose(): void
}

declare global {
  interface Window { google?: GoogleIdentityServices }
}
