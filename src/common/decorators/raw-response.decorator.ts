import { SetMetadata } from '@nestjs/common';
import { SKIP_RESPONSE_ENVELOPE } from '../interceptors/transform.interceptor';

/** Skips the `{ success, data }` envelope — for PDF/Excel/CSV streams. */
export const RawResponse = () => SetMetadata(SKIP_RESPONSE_ENVELOPE, true);
