"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequenceService = void 0;
const common_1 = require("@nestjs/common");
const document_sequence_entity_1 = require("../entities/document-sequence.entity");
let SequenceService = class SequenceService {
    async allocate(manager, key) {
        const raw = await manager.query(`UPDATE document_sequences
          SET current_value = current_value + 1,
              updated_at = now()
        WHERE key = $1
    RETURNING current_value, prefix, padding`, [key]);
        const row = this.firstRow(raw);
        if (!row) {
            throw new Error(`Document sequence "${key}" is not initialised. Run the migrations.`);
        }
        return this.format(row.prefix, row.current_value, row.padding);
    }
    async peek(manager, key) {
        const sequence = await manager.findOne(document_sequence_entity_1.DocumentSequence, { where: { key } });
        if (!sequence) {
            throw new Error(`Document sequence "${key}" is not initialised. Run the migrations.`);
        }
        return this.format(sequence.prefix, (BigInt(sequence.currentValue) + 1n).toString(), sequence.padding);
    }
    firstRow(raw) {
        if (!Array.isArray(raw) || raw.length === 0)
            return null;
        const rows = Array.isArray(raw[0]) ? raw[0] : raw;
        const candidate = rows[0];
        if (!candidate ||
            candidate.current_value === undefined ||
            candidate.prefix === undefined ||
            candidate.padding === undefined) {
            return null;
        }
        return candidate;
    }
    format(prefix, value, padding) {
        return `${prefix}${String(value).padStart(padding, '0')}`;
    }
};
exports.SequenceService = SequenceService;
exports.SequenceService = SequenceService = __decorate([
    (0, common_1.Injectable)()
], SequenceService);
//# sourceMappingURL=sequence.service.js.map