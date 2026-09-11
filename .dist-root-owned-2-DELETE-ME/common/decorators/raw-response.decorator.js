"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawResponse = void 0;
const common_1 = require("@nestjs/common");
const transform_interceptor_1 = require("../interceptors/transform.interceptor");
const RawResponse = () => (0, common_1.SetMetadata)(transform_interceptor_1.SKIP_RESPONSE_ENVELOPE, true);
exports.RawResponse = RawResponse;
//# sourceMappingURL=raw-response.decorator.js.map