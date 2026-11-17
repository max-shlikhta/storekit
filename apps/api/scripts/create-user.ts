import { parseArgs } from 'node:util';
import { sequelize } from '../src/database/index.js';
import { userRepository } from '../src/modules/auth/user.repository.js';
import { email as emailSchema } from '../src/shared/schemas.js';
import { hashPassword } from '../src/shared/security/password.js';
import { randomToken } from '../src/shared/security/secret-box.js';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
  },
});

const usage = 'Usage: npm run user:create -- --email owner@example.com [--name "Owner"]';

const email = emailSchema.safeParse(values.email);

if (!email.success) {
  console.error(usage);
  process.exit(1);
}

// The password is generated and printed once; only its hash is stored.
const password = randomToken(15);

try {
  await userRepository.create({
    email: email.data,
    name: values.name ?? null,
    passwordHash: await hashPassword(password),
  });

  console.log(`Created ${email.data}\nPassword: ${password}`);
} finally {
  await sequelize.close();
}
