import type { Request, Response } from 'express';
import { parseBody, parseId } from '../../shared/http/request.js';
import { getStore } from '../store/store.context.js';
import type { Category } from './category.model.js';
import { createCategorySchema, updateCategorySchema } from './category.schema.js';
import { categoryService } from './category.service.js';

const toCategoryDto = (category: Category) => ({
  id: category.id,
  name: category.name,
  position: category.position,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

export const categoryController = {
  getCategories: async (_req: Request, res: Response) => {
    const categories = await categoryService.getCategories(getStore(res).id);

    res.json({ data: categories.map(toCategoryDto) });
  },

  getCategory: async (req: Request, res: Response) => {
    const categoryId = parseId(req.params.categoryId, 'Category');

    res.json({
      data: toCategoryDto(await categoryService.getCategory(getStore(res).id, categoryId)),
    });
  },

  createCategory: async (req: Request, res: Response) => {
    const input = parseBody(req, createCategorySchema);
    const category = await categoryService.createCategory(getStore(res).id, input);

    res.status(201).json({ data: toCategoryDto(category) });
  },

  updateCategory: async (req: Request, res: Response) => {
    const categoryId = parseId(req.params.categoryId, 'Category');
    const input = parseBody(req, updateCategorySchema);
    const category = await categoryService.updateCategory(getStore(res).id, categoryId, input);

    res.json({ data: toCategoryDto(category) });
  },

  deleteCategory: async (req: Request, res: Response) => {
    const categoryId = parseId(req.params.categoryId, 'Category');
    await categoryService.deleteCategory(getStore(res).id, categoryId);

    res.status(204).end();
  },
};
