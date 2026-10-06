import { Controller, Get } from '@nestjs/common';

/**
 * Фаза 1 (docs/development-plan.md): minimal liveness check, no dependency checks yet.
 * Extend in Фаза 8 (Backend-интеграция) with DB/Redis readiness once those are wired up.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok' as const,
      service: 'mmusic-api',
      timestamp: new Date().toISOString(),
    };
  }
}
