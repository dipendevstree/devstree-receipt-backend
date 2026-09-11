import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateClientDto, UpdateClientDto } from './client.dto';

/** Mirrors the global ValidationPipe options in main.ts. */
async function errorsFor<T extends object>(
  type: new () => T,
  payload: Record<string, unknown>,
): Promise<{ instance: T; properties: string[]; messages: string[] }> {
  const instance = plainToInstance(type, payload);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return {
    instance,
    properties: errors.map((error) => error.property),
    messages: errors.flatMap((error) => Object.values(error.constraints ?? {})),
  };
}

describe('CreateClientDto', () => {
  it('accepts the five supported fields', async () => {
    const { properties } = await errorsFor(CreateClientDto, {
      name: 'Acme',
      email: 'accounts@acme.example',
      phone: '+91 98250 11223',
      country: 'India',
      status: 'ACTIVE',
    });
    expect(properties).toEqual([]);
  });

  it('accepts a name on its own — every other field is optional', async () => {
    const { properties } = await errorsFor(CreateClientDto, { name: 'Acme' });
    expect(properties).toEqual([]);
  });

  it.each([
    ['missing', {}],
    ['undefined', { name: undefined }],
    ['null', { name: null }],
    ['empty', { name: '' }],
    ['whitespace only', { name: '   \t ' }],
  ])('rejects a %s client name', async (_label, payload) => {
    const { properties, messages } = await errorsFor(CreateClientDto, payload);
    expect(properties).toContain('name');
    // The API surfaces the first message, so it must be the meaningful one.
    expect(messages[0]).toBe('Client name is required.');
  });

  it('trims the client name before it is saved', async () => {
    const { instance, properties } = await errorsFor(CreateClientDto, { name: '  Acme Retail  ' });
    expect(properties).toEqual([]);
    expect(instance.name).toBe('Acme Retail');
  });

  it('validates the email only when one is supplied', async () => {
    expect((await errorsFor(CreateClientDto, { name: 'Acme', email: '' })).properties).toEqual([]);
    const invalid = await errorsFor(CreateClientDto, { name: 'Acme', email: 'not-an-email' });
    expect(invalid.properties).toEqual(['email']);
    expect(invalid.messages).toContain('Enter a valid email address.');
  });

  it('keeps the existing phone format rule', async () => {
    const { properties } = await errorsFor(CreateClientDto, { name: 'Acme', phone: 'call me' });
    expect(properties).toEqual(['phone']);
  });

  it('rejects an unknown status', async () => {
    const { properties } = await errorsFor(CreateClientDto, { name: 'Acme', status: 'ARCHIVED' });
    expect(properties).toEqual(['status']);
  });

  it.each([
    'companyName',
    'alternatePhone',
    'address',
    'city',
    'state',
    'postalCode',
    'taxNumber',
    'notes',
  ])('no longer accepts the retired "%s" field', async (field) => {
    const { properties } = await errorsFor(CreateClientDto, { name: 'Acme', [field]: 'value' });
    expect(properties).toEqual([field]);
  });
});

describe('UpdateClientDto', () => {
  it('allows the name to be omitted', async () => {
    const { properties } = await errorsFor(UpdateClientDto, { phone: '9876543210' });
    expect(properties).toEqual([]);
  });

  it.each([
    ['null', null],
    ['empty', ''],
    ['whitespace only', '    '],
  ])('rejects a %s name when one is sent', async (_label, name) => {
    const { properties } = await errorsFor(UpdateClientDto, { name });
    expect(properties).toEqual(['name']);
  });

  it('lets an optional contact field be cleared with null', async () => {
    const { properties } = await errorsFor(UpdateClientDto, {
      email: null,
      phone: null,
      country: null,
    });
    expect(properties).toEqual([]);
  });
});
