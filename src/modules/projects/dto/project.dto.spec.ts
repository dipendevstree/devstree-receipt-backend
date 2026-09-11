import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';

const CLIENT_ID = '0b7c1b3e-7d2a-4e8f-9a51-3f2c6d8e9a10';

async function propertiesFor<T extends object>(
  type: new () => T,
  payload: Record<string, unknown>,
): Promise<{ instance: T; properties: string[] }> {
  const instance = plainToInstance(type, payload);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, properties: errors.map((error) => error.property) };
}

describe('CreateProjectDto', () => {
  it('does not require a project amount', async () => {
    const { properties } = await propertiesFor(CreateProjectDto, {
      clientId: CLIENT_ID,
      projectName: 'Retainer',
    });
    expect(properties).toEqual([]);
  });

  it('keeps a blank project amount as "not defined", never zero', async () => {
    const { instance, properties } = await propertiesFor(CreateProjectDto, {
      clientId: CLIENT_ID,
      projectName: 'Retainer',
      projectAmount: '   ',
    });
    expect(properties).toEqual([]);
    expect(instance.projectAmount).toBeNull();
  });

  it('still validates a supplied project amount', async () => {
    const { properties } = await propertiesFor(CreateProjectDto, {
      clientId: CLIENT_ID,
      projectName: 'Fixed',
      projectAmount: '-10',
    });
    expect(properties).toEqual(['projectAmount']);
  });

  it.each(['expectedEndDate', 'notes'])(
    'no longer accepts the retired "%s" field',
    async (field) => {
      const { properties } = await propertiesFor(CreateProjectDto, {
        clientId: CLIENT_ID,
        projectName: 'Website',
        [field]: field === 'expectedEndDate' ? '2026-12-31' : 'a note',
      });
      expect(properties).toEqual([field]);
    },
  );
});

describe('UpdateProjectDto', () => {
  it.each(['expectedEndDate', 'notes'])(
    'no longer accepts the retired "%s" field',
    async (field) => {
      const { properties } = await propertiesFor(UpdateProjectDto, {
        [field]: field === 'expectedEndDate' ? '2026-12-31' : 'a note',
      });
      expect(properties).toEqual([field]);
    },
  );

  it('can still clear the project amount with null', async () => {
    const { instance, properties } = await propertiesFor(UpdateProjectDto, { projectAmount: null });
    expect(properties).toEqual([]);
    expect(instance.projectAmount).toBeNull();
  });
});
