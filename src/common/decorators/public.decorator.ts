import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts a route out of JwtAuthGuard. Use sparingly — auth is the default. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
