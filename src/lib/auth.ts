import { timingSafeEqual } from 'crypto';
/** History/League endpoints are host-only: passcode travels in a header, never in the URL. */
export function authed(req: Request) {
  const want = process.env.HOST_PASSCODE ?? '';
  const got = req.headers.get('x-host-pass') ?? '';
  return want.length > 0 && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
