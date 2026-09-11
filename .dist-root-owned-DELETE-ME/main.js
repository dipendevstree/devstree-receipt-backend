"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const app_constants_1 = require("./common/constants/app.constants");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: false });
    const config = app.get(config_1.ConfigService);
    const port = config.get('app.port', 5001);
    const prefix = config.get('app.apiPrefix', 'api');
    const isProduction = config.get('app.isProduction', false);
    const corsOrigins = config.get('app.corsOrigins', ['http://localhost:5000']);
    app.setGlobalPrefix(prefix);
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use((0, compression_1.default)());
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', app_constants_1.FINANCIAL_UNLOCK_HEADER],
        exposedHeaders: ['Content-Disposition'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
        disableErrorMessages: false,
        validationError: { target: false, value: false },
    }));
    app.enableShutdownHooks();
    if (!isProduction) {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('Devstree Receipt System API')
            .setDescription([
            'Client → Project → Payment → Receipt management with encrypted financial data.',
            '',
            '**Financial security:** every monetary value is stored as AES-256-GCM ciphertext.',
            'Decrypted amounts are returned only while a financial unlock session is active.',
            'Unlock with `POST /financial/unlock`, then send the returned token in the',
            `\`${app_constants_1.FINANCIAL_UNLOCK_HEADER}\` header. While locked, amount fields are \`null\` —`,
            'the real value is never sent to the client.',
        ].join('\n'))
            .setVersion('1.0')
            .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
            .addApiKey({ type: 'apiKey', name: app_constants_1.FINANCIAL_UNLOCK_HEADER, in: 'header' }, 'financial-token')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup(`${prefix}/docs`, app, document, {
            swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
        });
        logger.log(`Swagger UI available at /${prefix}/docs`);
    }
    await app.listen(port, '0.0.0.0');
    logger.log(`Devstree Receipt API listening on port ${port} (${config.get('app.env')})`);
}
bootstrap().catch((error) => {
    new common_1.Logger('Bootstrap').error(`Application failed to start: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
//# sourceMappingURL=main.js.map