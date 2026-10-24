const KEY = 'asatunes_token'

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      localStorage.setItem(KEY, token)
    } catch {
      /* diabaikan: sesi hanya bertahan selama tab terbuka */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* diabaikan */
    }
  },
}