import { User } from '../modules/auth/user.model.js';
import { Order } from '../modules/order/order.model.js';
import { OrderLine } from '../modules/order/order-line.model.js';
import { ProductVariant } from '../modules/product/product-variant.model.js';
import { Product } from '../modules/product/product.model.js';
import { StoreMember } from '../modules/store/store-member.model.js';
import { Store } from '../modules/store/store.model.js';

// Sequelize 6 cannot declare composite foreign keys, so associations carry no constraints here:
// the real FKs, (store_id, id) pairs, live in the migration as raw SQL.
export const setupAssociations = () => {
  Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants', constraints: false });
  ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product', constraints: false });
  Order.hasMany(OrderLine, { foreignKey: 'orderId', as: 'lines', constraints: false });

  StoreMember.belongsTo(Store, { foreignKey: 'storeId', as: 'store', constraints: false });
  StoreMember.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
};
