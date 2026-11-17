import { Router } from 'express';
import {
  loadSession,
  requireActiveSession,
  verifyOrigin,
} from '../modules/auth/auth.middleware.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { categoryRouter } from '../modules/category/category.routes.js';
import { customerRouter } from '../modules/customer/customer.routes.js';
import { orderRouter } from '../modules/order/order.routes.js';
import { productRouter } from '../modules/product/product.routes.js';
import { storeTeamRouter } from '../modules/store/store-team.routes.js';
import { storeContext } from '../modules/store/store.context.js';
import { storeItemRouter, storeRouter } from '../modules/store/store.routes.js';
import { requireJsonBody } from '../shared/middlewares/require-json.js';

// Everything a store owns lives under /stores/:storeId and passes through storeContext first:
// that is the one place that decides which store a request is about.
const storeScopedRouter = Router({ mergeParams: true });

storeScopedRouter.use(storeContext);
storeScopedRouter.use('/', storeItemRouter);
storeScopedRouter.use('/members', storeTeamRouter);
storeScopedRouter.use('/customers', customerRouter);
storeScopedRouter.use('/categories', categoryRouter);
storeScopedRouter.use('/products', productRouter);
storeScopedRouter.use('/orders', orderRouter);

export const apiRouter = Router();

apiRouter.use(verifyOrigin);
apiRouter.use(loadSession);
apiRouter.use(requireJsonBody);
apiRouter.use('/auth', authRouter);
apiRouter.use(requireActiveSession);
apiRouter.use('/stores', storeRouter);
apiRouter.use('/stores/:storeId', storeScopedRouter);
