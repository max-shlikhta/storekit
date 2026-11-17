import type { Request, Response } from 'express';
import { parseBody, parseId, parseInput } from '../../shared/http/request.js';
import { assertCanSetCosts, canSeeCosts, getStore } from '../store/store.context.js';
import type { ProductVariant } from './product-variant.model.js';
import type { Product } from './product.model.js';
import {
  createProductSchema,
  createVariantSchema,
  listProductsSchema,
  updateProductSchema,
  updateVariantSchema,
} from './product.schema.js';
import { productService } from './product.service.js';

// The purchase price is hidden from staff.
const toVariantDto = (variant: ProductVariant, showCosts: boolean) => ({
  id: variant.id,
  productId: variant.productId,
  sku: variant.sku,
  title: variant.title,
  priceMinor: variant.priceMinor,
  ...(showCosts && { costPriceMinor: variant.costPriceMinor }),
  stockOnHand: variant.stockOnHand,
  allowBackorder: variant.allowBackorder,
  isActive: variant.isActive,
  createdAt: variant.createdAt,
  updatedAt: variant.updatedAt,
});

const toProductDto = (product: Product, variants: ProductVariant[], showCosts: boolean) => ({
  id: product.id,
  categoryId: product.categoryId,
  title: product.title,
  description: product.description,
  status: product.status,
  variants: variants.map((variant) => toVariantDto(variant, showCosts)),
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

export const productController = {
  getProducts: async (req: Request, res: Response) => {
    const { limit, offset, ...filters } = parseInput(listProductsSchema, req.query);
    const { products, variants, total } = await productService.getProducts(
      getStore(res).id,
      filters,
      { limit, offset },
    );

    res.json({
      data: products.map((product) =>
        toProductDto(
          product,
          variants.filter(({ productId }) => productId === product.id),
          canSeeCosts(res),
        ),
      ),
      meta: { total, limit, offset },
    });
  },

  getProduct: async (req: Request, res: Response) => {
    const productId = parseId(req.params.productId, 'Product');
    const { product, variants } = await productService.getProduct(getStore(res).id, productId);

    res.json({ data: toProductDto(product, variants, canSeeCosts(res)) });
  },

  createProduct: async (req: Request, res: Response) => {
    const input = parseBody(req, createProductSchema);
    const product = await productService.createProduct(getStore(res).id, input);

    res.status(201).json({ data: toProductDto(product, [], canSeeCosts(res)) });
  },

  updateProduct: async (req: Request, res: Response) => {
    const productId = parseId(req.params.productId, 'Product');
    const input = parseBody(req, updateProductSchema);
    const store = getStore(res);
    await productService.updateProduct(store.id, productId, input);
    const { product, variants } = await productService.getProduct(store.id, productId);

    res.json({ data: toProductDto(product, variants, canSeeCosts(res)) });
  },

  deleteProduct: async (req: Request, res: Response) => {
    const productId = parseId(req.params.productId, 'Product');
    await productService.deleteProduct(getStore(res).id, productId);

    res.status(204).end();
  },

  createVariant: async (req: Request, res: Response) => {
    const productId = parseId(req.params.productId, 'Product');
    const input = parseBody(req, createVariantSchema);
    assertCanSetCosts(res, input.costPriceMinor ?? undefined);
    const variant = await productService.createVariant(getStore(res).id, productId, input);

    res.status(201).json({ data: toVariantDto(variant, canSeeCosts(res)) });
  },

  updateVariant: async (req: Request, res: Response) => {
    const productId = parseId(req.params.productId, 'Product');
    const variantId = parseId(req.params.variantId, 'Variant');
    const input = parseBody(req, updateVariantSchema);
    assertCanSetCosts(res, input.costPriceMinor);
    const variant = await productService.updateVariant(
      getStore(res).id,
      productId,
      variantId,
      input,
    );

    res.json({ data: toVariantDto(variant, canSeeCosts(res)) });
  },
};
