const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
].join(' ');

/**
 * Handles Google OAuth 2.0 token requests and API interaction.
 */
export class GoogleAuthService {
  private static TOKEN_KEY = 'google_oauth_token';
  private static EXPIRE_KEY = 'google_oauth_expires_at';

  /**
   * Triggers the Google OAuth 2.0 token flow using a popup window.
   */
  public static async getAccessToken(): Promise<string> {
    const cachedToken = localStorage.getItem(this.TOKEN_KEY);
    const expiresAt = localStorage.getItem(this.EXPIRE_KEY);

    if (cachedToken && expiresAt && Date.now() < parseInt(expiresAt)) {
      return cachedToken;
    }

    return new Promise((resolve, reject) => {
      const redirectUri = window.location.origin;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(SCOPES)}` +
        `&prompt=consent`;

      // Open OAuth in a popup window
      const popup = window.open(authUrl, 'google-oauth', 'width=600,height=600');
      if (!popup) {
        reject(new Error('Popup blocked by browser. Please enable popups.'));
        return;
      }

      // Check the popup URL periodically for the access token hash fragment
      const interval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(interval);
            reject(new Error('Sign-in popup closed by user.'));
            return;
          }

          const currentUrl = popup.location.href;
          if (currentUrl.includes(redirectUri) && currentUrl.includes('#')) {
            const hash = popup.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const expiresIn = params.get('expires_in');

            if (accessToken) {
              const expireTime = Date.now() + parseInt(expiresIn || '3600') * 1000;
              localStorage.setItem(this.TOKEN_KEY, accessToken);
              localStorage.setItem(this.EXPIRE_KEY, expireTime.toString());
              
              popup.close();
              clearInterval(interval);
              resolve(accessToken);
            }
          }
        } catch {
          // Cross-origin check triggers exception until the popup redirects back to redirectUri
        }
      }, 500);
    });
  }

  /**
   * Helper function to execute authenticated requests to Google APIs.
   */
  public static async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google API request failed: ${res.statusText}. Details: ${errText}`);
    }
    return res;
  }
}
