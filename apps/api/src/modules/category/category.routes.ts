import { Router } from 'express';
import { requireStoreRole } from '../store/store.context.js';
import { categoryController } from './category.controller.js';

const ownerOnly = requireStoreRole('owner');

export const categoryRouter = Router();

categoryRouter.get('/', categoryController.getCategories);
categoryRouter.post('/', ownerOnly, categoryController.createCategory);
categoryRouter.get('/:categoryId', categoryController.getCategory);
categoryRouter.patch('/:categoryId', ownerOnly, categoryController.updateCategory);
categoryRouter.delete('/:categoryId', ownerOnly, categoryController.deleteCategory);
