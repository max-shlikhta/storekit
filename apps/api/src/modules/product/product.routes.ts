import { Router } from 'express';
import { inventoryRouter } from '../inventory/inventory.routes.js';
import { requireStoreRole } from '../store/store.context.js';
import { productController } from './product.controller.js';

const ownerOnly = requireStoreRole('owner');

export const productRouter = Router({ mergeParams: true });

productRouter.get('/', productController.getProducts);
productRouter.post('/', ownerOnly, productController.createProduct);
productRouter.get('/:productId', productController.getProduct);
productRouter.patch('/:productId', ownerOnly, productController.updateProduct);
productRouter.delete('/:productId', ownerOnly, productController.deleteProduct);
productRouter.post('/:productId/variants', ownerOnly, productController.createVariant);
productRouter.patch('/:productId/variants/:variantId', ownerOnly, productController.updateVariant);
productRouter.use('/:productId/variants/:variantId', inventoryRouter);
