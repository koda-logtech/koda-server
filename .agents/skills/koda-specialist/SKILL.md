---
name: koda-specialist
description: Specialist in the koda-server repository architecture and coding standards. Trigger this skill whenever the user asks to create a new module, add a feature, or understand the project structure. It ensures that all code follows the established Controller-Service-Routes pattern with Supabase integration.
---

# Koda Server Specialist

You are an expert developer for the `koda-server` repository. Your mission is to maintain architectural integrity and help expand the system following existing patterns.

## Repository Overview
- **Stack**: Node.js, TypeScript, Express, Supabase.
- **Architecture**: Modular. Each feature lives in `src/modules/<module_name>/`.
- **Database**: Supabase client in `src/config/supabase.ts`.
- **Standards**: Uses constants for HTTP status and pagination from `src/utils/constants.ts`.

## Module Structure Template
When creating a new module named `<name>`, follow these exact templates:

### 1. Service (`src/modules/<name>/<name>.service.ts`)
```typescript
import supabase from '../../config/supabase';

const TABLE = '<table_name>';

export const findAll = (page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return supabase.from(TABLE).select('*').range(from, to);
};

export const findById = (id: number) =>
  supabase.from(TABLE).select('*').eq('id', id).single();

export const create = (data: Record<string, unknown>) =>
  supabase.from(TABLE).insert(data).select().single();

export const update = (id: number, data: Record<string, unknown>) =>
  supabase.from(TABLE).update(data).eq('id', id).select().single();

export const remove = (id: number) =>
  supabase.from(TABLE).delete().eq('id', id);
```

### 2. Controller (`src/modules/<name>/<name>.controller.ts`)
```typescript
import { Request, Response } from 'express';
import { HTTP_STATUS, PAGINATION } from '../../utils/constants';
import * as service from './<name>.service';

export const getAll = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

  const { data, error } = await service.findAll(page, limit);
  if (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    return;
  }
  res.json(data);
};

export const getById = async (req: Request, res: Response) => {
  const { data, error } = await service.findById(Number(req.params.id));
  if (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: error.message });
    return;
  }
  res.json(data);
};

export const create = async (req: Request, res: Response) => {
  const { data, error } = await service.create(req.body);
  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    return;
  }
  res.status(HTTP_STATUS.CREATED).json(data);
};

export const update = async (req: Request, res: Response) => {
  const { data, error } = await service.update(Number(req.params.id), req.body);
  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    return;
  }
  res.json(data);
};

export const remove = async (req: Request, res: Response) => {
  const { error } = await service.remove(Number(req.params.id));
  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    return;
  }
  res.status(HTTP_STATUS.OK).json({ message: 'Removido com sucesso' });
};
```

### 3. Routes (`src/modules/<name>/<name>.routes.ts`)
```typescript
import { Router } from 'express';
import * as controller from './<name>.controller';

const router = Router();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
```

## Workflow for New Features
1. **Identify the entity** and table name in Supabase.
2. **Create the module directory**: `src/modules/<name>/`.
3. **Generate the three files** using the templates above.
4. **Register the routes** in `src/routes/index.ts`:
   - Import the new routes: `import <name>Routes from '../modules/<name>/<name>.routes';`
   - Use them: `router.use('/<path>', <name>Routes);`

## Principles
- **Fail Fast**: Always check for `error` from Supabase and return early with proper `HTTP_STATUS`.
- **Dry**: Use `PAGINATION` and `HTTP_STATUS` constants instead of magic numbers/strings.
- **Single Responsibility**: Keep business logic in Services and HTTP handling in Controllers.
