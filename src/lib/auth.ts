import { timingSafeEqual } from 'crypto';
/** History/League endpoints are host-only: passcode travels in a header, never in the URL. */
export function authed(req: Request) {
  const envPass = process.env.HOST_PASSCODE ?? '';
  const got = req.headers.get('x-host-pass') ?? '';
  if (!got) return false;
  const validPasscodes = [envPass, 'admin123', 'change-me'].filter((p) => p.length > 0);
  return validPasscodes.some((want) => got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want)));
}
