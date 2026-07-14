// app/api/auth의 OTP 인증 성공 시점에 이메일을 잠깐 "인증됨"으로 표시해두고,
// /api/orders/lookup 같은 후속 요청에서 재사용한다. codeStore와 동일하게 인메모리라
// 서버 재시작 시 초기화됨 — 인증 유효시간(15분) 안에서만 유효하므로 문제 없음.
const verifiedEmails = new Map<string, number>();

export function markEmailVerified(email: string) {
  verifiedEmails.set(email.trim().toLowerCase(), Date.now() + 15 * 60 * 1000);
}

export function isEmailVerified(email: string): boolean {
  const expires = verifiedEmails.get(email.trim().toLowerCase());
  return !!expires && Date.now() <= expires;
}
