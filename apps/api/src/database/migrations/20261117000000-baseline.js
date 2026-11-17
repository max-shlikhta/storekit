'use strict';

// One baseline for the whole schema. Conventions used throughout:
// - every store-owned table has store_id NOT NULL and UNIQUE (store_id, id), so foreign keys
//   between store-owned tables are composite (store_id, x_id): a row can never point into
//   another store;
// - constraints have explicit names, which the repositories map to readable 409 errors;
// - money is an integer in minor units.
module.exports = {
  up: async (queryInterface) => {
    const run = (sql) => queryInterface.sequelize.query(sql);

    await run(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(254) NOT NULL,
        name varchar(255),
        password_hash varchar(255) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        two_factor_secret varchar(255),
        two_factor_enabled_at timestamptz,
        two_factor_last_step bigint,
        two_factor_required boolean NOT NULL DEFAULT false,
        last_login_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_email_key UNIQUE (email)
      );

      CREATE TABLE sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        token_hash char(64) NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'active',
        user_agent varchar(255),
        ip varchar(64),
        expires_at timestamptz NOT NULL,
        last_used_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT sessions_token_hash_key UNIQUE (token_hash),
        CONSTRAINT sessions_status_check
          CHECK (status IN ('active', 'two_factor_pending', 'two_factor_setup_required'))
      );
      CREATE INDEX sessions_user_id_idx ON sessions (user_id);
      CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

      CREATE TABLE user_recovery_codes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        code_hash char(64) NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT user_recovery_codes_user_id_code_hash_key UNIQUE (user_id, code_hash)
      );

      CREATE TABLE stores (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(63) NOT NULL,
        name varchar(255) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        currency char(3) NOT NULL DEFAULT 'USD',
        last_order_number integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT stores_slug_key UNIQUE (slug)
      );

      CREATE TABLE store_members (
        store_id uuid NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        role varchar(16) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (store_id, user_id),
        CONSTRAINT store_members_role_check CHECK (role IN ('owner', 'staff'))
      );
      CREATE INDEX store_members_user_id_idx ON store_members (user_id);

      CREATE TABLE categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id uuid NOT NULL REFERENCES stores (id) ON DELETE RESTRICT,
        name varchar(100) NOT NULL,
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT categories_store_id_id_key UNIQUE (store_id, id)
      );
      CREATE UNIQUE INDEX categories_store_id_lower_name_key
        ON categories (store_id, lower(name));

      CREATE TABLE products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id uuid NOT NULL REFERENCES stores (id) ON DELETE RESTRICT,
        category_id uuid,
        title varchar(255) NOT NULL,
        description text,
        status varchar(16) NOT NULL DEFAULT 'draft',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT products_store_id_id_key UNIQUE (store_id, id),
        CONSTRAINT products_status_check CHECK (status IN ('draft', 'active', 'archived')),
        CONSTRAINT products_store_id_category_id_fkey
          FOREIGN KEY (store_id, category_id) REFERENCES categories (store_id, id)
          ON DELETE RESTRICT
      );
      CREATE INDEX products_store_id_status_idx ON products (store_id, status);
      CREATE INDEX products_store_id_category_id_idx ON products (store_id, category_id);

      CREATE TABLE product_variants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id uuid NOT NULL,
        product_id uuid NOT NULL,
        sku varchar(64) NOT NULL,
        title varchar(100) NOT NULL,
        price_minor integer NOT NULL,
        cost_price_minor integer,
        stock_on_hand integer NOT NULL DEFAULT 0,
        allow_backorder boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT product_variants_store_id_id_key UNIQUE (store_id, id),
        CONSTRAINT product_variants_store_id_product_id_fkey
          FOREIGN KEY (store_id, product_id) REFERENCES products (store_id, id)
          ON DELETE CASCADE,
        CONSTRAINT product_variants_price_check CHECK (price_minor > 0),
        CONSTRAINT product_variants_cost_check CHECK (cost_price_minor IS NULL OR cost_price_minor >= 0),
        -- Below zero only for a variant that allows backorder.
        CONSTRAINT product_variants_stock_check CHECK (stock_on_hand >= 0 OR allow_backorder)
      );
      CREATE UNIQUE INDEX product_variants_store_id_sku_key ON product_variants (store_id, sku);
      CREATE INDEX product_variants_store_id_product_id_idx
        ON product_variants (store_id, product_id);

      CREATE TABLE stock_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id uuid NOT NULL,
        variant_id uuid NOT NULL,
        reason varchar(32) NOT NULL,
        delta integer NOT NULL,
        quantity_after integer NOT NULL,
        note varchar(500),
        order_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT stock_movements_store_id_id_key UNIQUE (store_id, id),
        CONSTRAINT stock_movements_store_id_variant_id_fkey
          FOREIGN KEY (store_id, variant_id) REFERENCES product_variants (store_id, id)
          ON DELETE RESTRICT,
        CONSTRAINT stock_movements_delta_check CHECK (delta <> 0)
      );
      CREATE INDEX stock_movements_variant_idx
        ON stock_movements (store_id, variant_id, created_at DESC);

      CREATE TABLE customers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id uuid NOT NULL REFERENCES stores (id) ON DELETE RESTRICT,
        name varchar(255) NOT NULL,
        phone varchar(16),
        note varchar(1000),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT customers_store_id_id_key UNIQUE (store_id, id),
        CONSTRAINT customers_store_id_phone_key UNIQUE (store_id, phone)
      );

      CREATE TABLE orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id uuid NOT NULL REFERENCES stores (id) ON DELETE RESTRICT,
        number integer NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'new',
        customer_id uuid,
        customer_name varchar(255) NOT NULL,
        customer_phone varchar(16),
        currency char(3) NOT NULL,
        subtotal_minor integer NOT NULL,
        discount_minor integer NOT NULL DEFAULT 0,
        total_minor integer NOT NULL,
        note varchar(1000),
        cancel_reason varchar(500),
        confirmed_at timestamptz,
        shipped_at timestamptz,
        completed_at timestamptz,
        cancelled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT orders_store_id_id_key UNIQUE (store_id, id),
        CONSTRAINT orders_store_id_number_key UNIQUE (store_id, number),
        CONSTRAINT orders_status_check
          CHECK (status IN ('new', 'confirmed', 'shipped', 'completed', 'cancelled')),
        CONSTRAINT orders_totals_check
          CHECK (discount_minor >= 0 AND discount_minor <= subtotal_minor
                 AND total_minor = subtotal_minor - discount_minor),
        CONSTRAINT orders_store_id_customer_id_fkey
          FOREIGN KEY (store_id, customer_id) REFERENCES customers (store_id, id)
          ON DELETE RESTRICT
      );
      CREATE INDEX orders_store_id_status_idx ON orders (store_id, status);

      CREATE TABLE order_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id uuid NOT NULL,
        order_id uuid NOT NULL,
        variant_id uuid NOT NULL,
        product_title varchar(255) NOT NULL,
        variant_title varchar(100) NOT NULL,
        sku varchar(64) NOT NULL,
        unit_price_minor integer NOT NULL,
        unit_cost_minor integer,
        quantity integer NOT NULL,
        line_total_minor integer NOT NULL,
        position integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT order_lines_store_id_id_key UNIQUE (store_id, id),
        CONSTRAINT order_lines_store_id_order_id_fkey
          FOREIGN KEY (store_id, order_id) REFERENCES orders (store_id, id) ON DELETE CASCADE,
        CONSTRAINT order_lines_store_id_variant_id_fkey
          FOREIGN KEY (store_id, variant_id) REFERENCES product_variants (store_id, id)
          ON DELETE RESTRICT,
        CONSTRAINT order_lines_quantity_check CHECK (quantity > 0),
        CONSTRAINT order_lines_total_check CHECK (line_total_minor = unit_price_minor * quantity)
      );
      CREATE INDEX order_lines_order_idx ON order_lines (store_id, order_id);

      CREATE TABLE order_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id uuid NOT NULL,
        order_id uuid NOT NULL,
        type varchar(32) NOT NULL,
        from_status varchar(16),
        to_status varchar(16),
        actor_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
        data jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT order_events_store_id_order_id_fkey
          FOREIGN KEY (store_id, order_id) REFERENCES orders (store_id, id) ON DELETE CASCADE
      );
      CREATE INDEX order_events_order_idx ON order_events (store_id, order_id, created_at);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS order_events, order_lines, orders, customers, stock_movements,
        product_variants, products, categories, store_members, stores, user_recovery_codes,
        sessions, users CASCADE;
    `);
  },
};
