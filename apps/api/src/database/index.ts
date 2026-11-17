import { RecoveryCode } from '../modules/auth/recovery-code.model.js';
import { Session } from '../modules/auth/session.model.js';
import { User } from '../modules/auth/user.model.js';
import { Category } from '../modules/category/category.model.js';
import { Customer } from '../modules/customer/customer.model.js';
import { StockMovement } from '../modules/inventory/stock-movement.model.js';
import { OrderEvent } from '../modules/order/order-event.model.js';
import { OrderLine } from '../modules/order/order-line.model.js';
import { Order } from '../modules/order/order.model.js';
import { ProductVariant } from '../modules/product/product-variant.model.js';
import { Product } from '../modules/product/product.model.js';
import { StoreMember } from '../modules/store/store-member.model.js';
import { Store } from '../modules/store/store.model.js';
import { setupAssociations } from './associations.js';
import { sequelize } from './sequelize.js';

setupAssociations();

export {
  Category,
  Customer,
  Order,
  OrderEvent,
  OrderLine,
  Product,
  ProductVariant,
  RecoveryCode,
  sequelize,
  Session,
  StockMovement,
  Store,
  StoreMember,
  User,
};
