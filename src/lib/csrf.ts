export function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function csrfHeaders(): HeadersInit {
  return { 'x-csrf-token': getCsrfToken() };
}
