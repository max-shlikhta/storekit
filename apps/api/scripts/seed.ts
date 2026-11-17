import { sequelize } from '../src/database/index.js';
import { userRepository } from '../src/modules/auth/user.repository.js';
import { categoryService } from '../src/modules/category/category.service.js';
import { orderService } from '../src/modules/order/order.service.js';
import { productService } from '../src/modules/product/product.service.js';
import { storeService } from '../src/modules/store/store.service.js';
import { hashPassword } from '../src/shared/security/password.js';

// Invented data for trying the app locally. The credentials are fixed on purpose and printed
// below: this is a development database, never a place for real accounts.
const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo-password-123';

const CATALOG = [
  {
    category: 'T-shirts',
    products: [
      { title: 'Classic tee', price: 1800, cost: 600, sizes: ['S', 'M', 'L'], stock: 12 },
      { title: 'Graphic tee', price: 2200, cost: 800, sizes: ['M', 'L'], stock: 6 },
    ],
  },
  {
    category: 'Hoodies',
    products: [
      { title: 'Everyday hoodie', price: 4900, cost: 1900, sizes: ['S', 'M', 'L'], stock: 8 },
    ],
  },
  {
    category: 'Accessories',
    products: [{ title: 'Canvas tote', price: 1500, cost: 400, sizes: ['One size'], stock: 25 }],
  },
];

if (await userRepository.findByEmail(DEMO_EMAIL)) {
  console.log(`${DEMO_EMAIL} already exists: nothing to seed`);
  await sequelize.close();
  process.exit(0);
}

try {
  const user = await userRepository.create({
    email: DEMO_EMAIL,
    name: 'Demo Owner',
    passwordHash: await hashPassword(DEMO_PASSWORD),
  });
  const store = await storeService.createStore(user, { slug: 'demo-store', name: 'Demo Store' });
  const variantIds: string[] = [];

  for (const [position, { category: name, products }] of CATALOG.entries()) {
    const category = await categoryService.createCategory(store.id, { name, position });

    for (const product of products) {
      const created = await productService.createProduct(store.id, {
        title: product.title,
        categoryId: category.id,
      });

      for (const size of product.sizes) {
        const variant = await productService.createVariant(store.id, created.id, {
          sku: `${product.title.slice(0, 3).toUpperCase()}-${size.replace(/\s/g, '').toUpperCase()}`,
          title: size,
          priceMinor: product.price,
          costPriceMinor: product.cost,
          initialStock: product.stock,
        });

        variantIds.push(variant.id);
      }

      await productService.updateProduct(store.id, created.id, { status: 'active' });
    }
  }

  const customers = [
    { name: 'Anna Kovalenko', phone: '+380501112233' },
    { name: 'Borys Melnyk', phone: '+380672223344' },
    { name: 'Olena Shevchenko', phone: null },
  ];
  const statuses = ['new', 'confirmed', 'shipped', 'completed', 'cancelled'] as const;

  for (const [index, customer] of customers.entries()) {
    for (const [offset, status] of statuses.entries()) {
      if ((index + offset) % 2 !== 0) {
        continue;
      }

      const first = variantIds[(index + offset) % variantIds.length];
      const second = variantIds[(index * 3 + offset + 2) % variantIds.length];

      if (!first || !second || first === second) {
        continue;
      }

      const { order } = await orderService.createOrder(
        store,
        {
          customer,
          lines: [
            { variantId: first, quantity: 1 + (offset % 2) },
            { variantId: second, quantity: 1 },
          ],
        },
        user.id,
      );
      const path: Record<string, readonly (typeof statuses)[number][]> = {
        new: [],
        confirmed: ['confirmed'],
        shipped: ['confirmed', 'shipped'],
        completed: ['confirmed', 'shipped', 'completed'],
        cancelled: ['cancelled'],
      };

      for (const next of path[status] ?? []) {
        await orderService.changeStatus(
          store.id,
          order.id,
          next === 'cancelled'
            ? { status: next, reason: 'Customer changed their mind' }
            : { status: next },
          user.id,
        );
      }
    }
  }

  console.log(`Seeded "${store.name}".\nSign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
} finally {
  await sequelize.close();
}
