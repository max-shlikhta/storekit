import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach } from 'node:test';
import type { CreationAttributes } from 'sequelize';
import { createApp } from '../src/app.js';
import { sequelize, type User } from '../src/database/index.js';
import { loginRateLimiter } from '../src/modules/auth/rate-limiter.js';
import { sessionService } from '../src/modules/auth/session.service.js';
import { userRepository } from '../src/modules/auth/user.repository.js';
import { SESSION_COOKIE } from '../src/shared/http/cookies.js';
import { hashPassword } from '../src/shared/security/password.js';

type RequestOptions = {
  method?: string;
  body?: unknown;
  rawBody?: string | Uint8Array;
  headers?: Record<string, string>;
  cookie?: string | null;
};

export type ApiResponse<T = any> = {
  status: number;
  headers: Headers;
  body: T;
};

const truncateTables = async () => {
  const database = sequelize.getDatabaseName();

  if (!database.endsWith('_test')) {
    throw new Error(`Refusing to truncate tables in "${database}"`);
  }

  const [rows] = await sequelize.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'Sequelize%'`,
  );
  const tables = (rows as { tablename: string }[]).map(({ tablename }) => `"${tablename}"`);

  if (tables.length > 0) {
    await sequelize.query(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
  }
};

export const TEST_PASSWORD = 'correct horse battery staple';

// Hashing is slow on purpose, so the test password is hashed once and reused.
let testPasswordHash: Promise<string> | undefined;

export const createUser = async (attributes: Partial<CreationAttributes<User>> = {}) =>
  userRepository.create({
    email: `user-${Math.random().toString(36).slice(2)}@example.com`,
    passwordHash: await (testPasswordHash ??= hashPassword(TEST_PASSWORD)),
    ...attributes,
  });

export const sessionCookie = async (user: User) => {
  const { token } = await sessionService.create(user, {});
  return `${SESSION_COOKIE}=${token}`;
};

export const cookieFrom = (headers: Headers) =>
  headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0] ?? '')
    .find(
      (cookie) =>
        cookie.startsWith(`${SESSION_COOKIE}=`) && cookie.length > SESSION_COOKIE.length + 1,
    );

export const setupApi = () => {
  let server: Server | undefined;
  let baseUrl = '';
  let adminCookie = '';

  before(async () => {
    server = createApp().listen(0, '127.0.0.1');
    await new Promise((resolve) => server?.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(async () => {
    await truncateTables();
    loginRateLimiter.clear();
    adminCookie = await sessionCookie(
      await createUser({ email: 'admin@example.com', name: 'Admin' }),
    );
  });

  after(async () => {
    await new Promise((resolve) => server?.close(resolve));
    await sequelize.close();
  });

  return async <T = any>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> => {
    const cookie = options.cookie === undefined ? adminCookie : options.cookie;
    const headers: Record<string, string> = {
      ...(cookie && { cookie }),
      ...options.headers,
    };
    let body: string | Uint8Array | undefined = options.rawBody;

    if (options.body !== undefined) {
      headers['content-type'] ??= 'application/json';
      body = JSON.stringify(options.body);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
      redirect: 'manual',
    });
    const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      status: response.status,
      headers: response.headers,
      body: (isJson ? JSON.parse(buffer.toString('utf8')) : buffer) as T,
    };
  };
};

export type Api = ReturnType<typeof setupApi>;

// A second person, signed in with their own cookie: the way tests check that stores stay apart.
export const signedInUser = async (email: string) => {
  const user = await createUser({ email });
  return { user, cookie: await sessionCookie(user) };
};

export const createStore = async (api: Api, slug: string, cookie?: string) => {
  const res = await api('/api/v1/stores', {
    method: 'POST',
    body: { slug, name: slug },
    ...(cookie !== undefined && { cookie }),
  });

  if (res.status !== 201) {
    throw new Error(`Cannot create the store: ${JSON.stringify(res.body)}`);
  }

  return res.body.data.id as string;
};

// A product on sale with one variant holding `stock` units.
export const createSellableProduct = async (
  api: Api,
  storeId: string,
  options: {
    title?: string;
    sku: string;
    priceMinor?: number;
    stock?: number;
    backorder?: boolean;
  },
  cookie?: string,
) => {
  const extra = cookie === undefined ? {} : { cookie };
  const product = await api(`/api/v1/stores/${storeId}/products`, {
    method: 'POST',
    body: { title: options.title ?? 'T-shirt' },
    ...extra,
  });
  const variant = await api(`/api/v1/stores/${storeId}/products/${product.body.data.id}/variants`, {
    method: 'POST',
    body: {
      sku: options.sku,
      title: 'M',
      priceMinor: options.priceMinor ?? 1000,
      costPriceMinor: 400,
      initialStock: options.stock ?? 5,
      allowBackorder: options.backorder ?? false,
    },
    ...extra,
  });
  const active = await api(`/api/v1/stores/${storeId}/products/${product.body.data.id}`, {
    method: 'PATCH',
    body: { status: 'active' },
    ...extra,
  });

  if (variant.status !== 201 || active.status !== 200) {
    throw new Error(`Cannot create the product: ${JSON.stringify([variant.body, active.body])}`);
  }

  return { productId: product.body.data.id as string, variantId: variant.body.data.id as string };
};
