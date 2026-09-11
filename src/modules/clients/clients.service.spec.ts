import { plainToInstance } from 'class-transformer';
import { ClientStatus } from 'src/common/enums/client-status.enum';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { ClientsService } from './clients.service';
import { UpdateClientDto } from './dto/client.dto';

const ACTOR: AuthenticatedUser = {
  id: 'user-1',
  name: 'Test Admin',
  email: 'admin@example.com',
  phone: null,
  roleId: 'role-1',
  roleName: 'ADMIN',
  permissions: [],
  tokenId: 'token-1',
};
const CONTEXT: RequestContext = { ipAddress: '127.0.0.1', userAgent: 'jest' };

describe('ClientsService.update', () => {
  let stored: Record<string, unknown>;
  let saved: Record<string, unknown> | null;
  let auditLog: { record: jest.Mock };
  let service: ClientsService;

  beforeEach(() => {
    stored = {
      id: 'c1',
      clientCode: 'CLI-0001',
      name: 'Acme Retail',
      email: 'accounts@acme.example',
      phone: '9876543210',
      country: 'India',
      status: ClientStatus.ACTIVE,
    };
    saved = null;
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    const clients = {
      findOne: jest.fn().mockImplementation(async () => ({ ...stored })),
      save: jest.fn().mockImplementation(async (entity) => {
        saved = { ...entity };
        return entity;
      }),
    };
    const masters = {
      find: jest.fn().mockResolvedValue([{ name: 'India', code: 'IN' }]),
    };
    const financials = { totalsForClient: jest.fn().mockResolvedValue(null) };

    service = new ClientsService(
      clients as never,
      {} as never,
      masters as never,
      financials as never,
      {} as never,
      auditLog as never,
      {} as never,
    );
  });

  it('leaves fields that were not sent untouched — including the name', async () => {
    // Built the way the ValidationPipe builds it, so omitted declared fields
    // are present as undefined own properties.
    const dto = plainToInstance(UpdateClientDto, { phone: null });

    await service.update('c1', dto, ACTOR, CONTEXT, false);

    expect(saved).toMatchObject({
      name: 'Acme Retail',
      email: 'accounts@acme.example',
      phone: null,
    });
    const entry = auditLog.record.mock.calls[0][0];
    expect(entry.description).toBe('Updated client Acme Retail');
    expect(entry.newValue).toEqual({ phone: null });
  });

  it('normalises a country code to the master name', async () => {
    const dto = plainToInstance(UpdateClientDto, { country: 'in' });
    await service.update('c1', dto, ACTOR, CONTEXT, false);
    // 'in' differs from the stored 'India', so it is checked against the masters.
    expect(saved).toMatchObject({ country: 'India' });
  });
});
